// app/api/add-customer/route.ts

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";
import { uploadImage } from "@/lib/upload";

import { Gender } from "@prisma/client";

import { randomUUID } from "crypto";

/* ------------------------------------------------------------------ */
/* Valid genders                                                      */
/* ------------------------------------------------------------------ */

const VALID_GENDERS: Gender[] = [
  "Male",
  "Female",
  "Other",
];

/* ================================================================== */
/* POST                                                               */
/* ================================================================== */

export async function POST(req: Request) {
  try {

    /* ------------------------------------------------------------------ */
    /* Auth                                                               */
    /* ------------------------------------------------------------------ */

    const { userId: clerkUserId } =
      await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user =
      await prisma.user.findUnique({
        where: {
          clerkUserId,
        },

        select: {
          id: true,
        },
      });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const userId = user.id;

    /* ------------------------------------------------------------------ */
    /* Parse form data                                                    */
    /* ------------------------------------------------------------------ */

    const fd = await req.formData();

    const name = fd
      .get("name")
      ?.toString()
      .trim();

    const address = fd
      .get("address")
      ?.toString()
      .trim();

    const region = fd
      .get("region")
      ?.toString()
      .trim();

    if (!name || !address || !region) {
      return NextResponse.json(
        {
          error:
            "Name, address and region are required",
        },
        { status: 400 }
      );
    }

    const mobile =
      fd
        .get("mobile")
        ?.toString()
        .trim() || null;

    // form field: aadhaarNo
    // db field: aadharNo

    const aadharNo =
      fd
        .get("aadhaarNo")
        ?.toString()
        .trim() || null;

    const remark =
      fd
        .get("remarks")
        ?.toString()
        .trim() || null;

    /* ------------------------------------------------------------------ */
    /* Mobile validation                                                  */
    /* ------------------------------------------------------------------ */

    if (
      mobile &&
      !/^\d{10}$/.test(mobile)
    ) {
      return NextResponse.json(
        {
          error:
            "Mobile number must be exactly 10 digits",
        },
        { status: 400 }
      );
    }

    /* ------------------------------------------------------------------ */
    /* Gender validation                                                  */
    /* ------------------------------------------------------------------ */

    const rawGender = fd
      .get("gender")
      ?.toString();

    const gender =
      VALID_GENDERS.includes(
        rawGender as Gender
      )
        ? (rawGender as Gender)
        : null;

    /* ------------------------------------------------------------------ */
    /* File uploads                                                       */
    /* ------------------------------------------------------------------ */

    const customerImgFile =
      fd.get("userImg");

    const idProofImgFile =
      fd.get("idProofImg");

    let customerImg:
      | string
      | null = null;

    let idProofImg:
      | string
      | null = null;

    // Both photos are optional side effects — Customer.customerImg and
    // .idProofImg are nullable and only ever used for display. A Cloudinary
    // outage must not block adding a customer. Each upload is caught on its
    // own so one failing doesn't take the other down with it. There is no
    // edit path for either field (customer PATCH is JSON-body, name/address/
    // region/mobile/aadharNo/remark only), so `warnings` is the only way the
    // owner learns a photo needs to be attempted again.

    const warnings: string[] = [];

    // Customer image

    if (
      customerImgFile instanceof File &&
      customerImgFile.size > 0
    ) {
      try {
        customerImg =
          await uploadImage(
            customerImgFile,
            `ELEKHAJOKHA/customers/${userId}`
          );
      } catch (e) {
        console.error("CUSTOMER PHOTO UPLOAD FAILED:", e instanceof Error ? e.message : e);
        warnings.push("Customer photo could not be uploaded — please attach it again later.");
      }
    }

    // ID proof image

    if (
      idProofImgFile instanceof File &&
      idProofImgFile.size > 0
    ) {
      try {
        idProofImg =
          await uploadImage(
            idProofImgFile,
            `ELEKHAJOKHA/idProofs/${userId}`
          );
      } catch (e) {
        console.error("ID PROOF UPLOAD FAILED:", e instanceof Error ? e.message : e);
        warnings.push("ID proof could not be uploaded — please attach it again later.");
      }
    }

    /* ------------------------------------------------------------------ */
    /* Create customer                                                    */
    /* ------------------------------------------------------------------ */

    const customer =
      await prisma.customer.create({
        data: {
          name,
          address,

          // stored as-is
          region,

          mobile,

          aadharNo,

          remark,

          gender,

          customerImg,

          idProofImg,

          userId,

          // unique customer share/view token
          viewToken:
            randomUUID(),
        },
      });

    /* ------------------------------------------------------------------ */
    /* Response                                                           */
    /* ------------------------------------------------------------------ */

    return NextResponse.json(
      {
        success: true,
        customer,
        ...(warnings.length ? { warnings } : {}),
      },
      { status: 201 }
    );

  } catch (error: unknown) {

    console.error(
      "ADD CUSTOMER ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to add customer",
      },
      { status: 500 }
    );
  }
}