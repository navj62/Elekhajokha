import { notFound } from "next/navigation";
import {prisma }from "@/lib/prisma";
import { calculateHybridInterest } from "@/lib/interest";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

function getStatusText(status: string) {
  if (status === "ACTIVE") return "🟢 Active";
  if (status === "RELEASED") return "✔ Closed";
  if (status === "OVERDUE") return "🔴 Overdue - Please repay soon";
  return status;
}

function getStatusColor(status: string) {
  if (status === "ACTIVE") return "bg-green-100 text-green-700 border-green-200";
  if (status === "OVERDUE") return "bg-red-100 text-red-700 border-red-200";
  return "bg-gray-100 text-gray-600 border-gray-200";
}

export default async function CustomerPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const customer = await prisma.customer.findUnique({
    where: { viewToken: token },
    include: {
      user: {
        select: {
          shopName: true,
          mobile: true, // ✅ Changed from 'num' to 'mobile'
        },
      },
      pledges: {
        orderBy: { pledgeDate: "desc" },
      },
    },
  });

  if (!customer) {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-center px-4 bg-gray-50">
        <h1 className="text-xl font-semibold text-gray-800">
          Invalid or Expired Link
        </h1>
        <p className="text-gray-500 mt-2">
          Please contact the shop for a valid link.
        </p>
      </div>
    );
  }

  const currentDate = new Date();

  const processedPledges = customer.pledges.map((pledge) => {
    const loanAmount = pledge.loanAmount.toNumber();
    const annualInterestRate = pledge.interestRate.toNumber();

    let calculatedInterest = 0;
    let calculatedDue = 0;
    let durationMonths = 0;

    if (pledge.status !== "RELEASED") {
      const liveCalc = calculateHybridInterest(
        loanAmount,
        annualInterestRate,
        pledge.pledgeDate,
        currentDate,
        pledge.allowCompounding,
        pledge.compoundingDuration as "MONTHLY" | "HALFYEARLY" | "YEARLY"
      );

      calculatedDue = liveCalc.receivableAmount;
      calculatedInterest = liveCalc.totalInterest;
      durationMonths = liveCalc.T;
    }

    return {
      ...pledge,
      parsedLoanAmount: loanAmount,
      parsedInterestRate: annualInterestRate,
      calculatedInterest,
      calculatedDue,
      durationMonths,
    };
  });

  const totalPledges = processedPledges.length;

  const totalAmountDueAcrossAll = processedPledges
    .filter((p) => p.status !== "RELEASED")
    .reduce((sum, pledge) => sum + pledge.calculatedDue, 0);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-12">
      
      {/* Shop Branding Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between px-2 pb-2 border-b border-gray-200 gap-2 mt-4">
        <h2 className="text-xl font-bold text-gray-800 tracking-tight">
          {customer.user.shopName}
        </h2>
        
        {/* ✅ Changed to use customer.user.mobile */}
        {customer.user.mobile && (
          <a 
            href={`tel:${customer.user.mobile}`} 
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 px-3 py-1.5 rounded-full transition-colors w-fit"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 013.5 2h1.148a1.5 1.5 0 011.465 1.175l.716 3.223a1.5 1.5 0 01-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 006.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 011.767-1.052l3.223.716A1.5 1.5 0 0118 15.352V16.5a1.5 1.5 0 01-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 012.43 8.326 13.019 13.019 0 012 5V3.5z" clipRule="evenodd" />
            </svg>
            Support: {customer.user.mobile}
          </a>
        )}
      </div>

      {/* Header Section */}
      <header className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Hello, {customer.name}
          </h1>
          <p className="text-gray-500 mt-1">
            Welcome to your secure ELekhaJokha dashboard.
          </p>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 min-w-[140px]">
            <p className="text-sm font-medium text-blue-600 mb-1">Total Pledges</p>
            <p className="text-2xl font-bold text-blue-900">{totalPledges}</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 min-w-[140px]">
            <p className="text-sm font-medium text-red-600 mb-1">Total Active Due</p>
            <p className="text-xl md:text-2xl font-bold text-red-900">
              {formatCurrency(totalAmountDueAcrossAll)}
            </p>
          </div>
        </div>
      </header>

      {/* Pledges Grid */}
      <section>
        <h2 className="text-xl font-semibold text-gray-800 mb-4 px-1">
          Your Pledges
        </h2>
        
        {processedPledges.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
            No pledges found on your account.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {processedPledges.map((pledge) => (
              <div 
                key={pledge.id} 
                className={`bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col transition-shadow hover:shadow-md ${
                  pledge.status === "RELEASED" ? "border-gray-200 opacity-75" : "border-gray-200"
                }`}
              >
                {/* Image Section */}
                {pledge.itemPhoto ? (
                  <div className="h-48 w-full relative bg-gray-100">
                    <img
                      src={pledge.itemPhoto}
                      alt="Pledge Item"
                      className={`w-full h-full object-cover ${pledge.status === "RELEASED" ? "grayscale" : ""}`}
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="h-32 w-full bg-gray-50 flex items-center justify-center border-b border-gray-100">
                    <span className="text-gray-400 text-sm">No Image Provided</span>
                  </div>
                )}

                {/* Card Content */}
                <div className="p-5 flex flex-col flex-grow">
                  <div className="flex justify-between items-start mb-4 gap-2">
                    <div>
                      <p className="text-xs text-gray-500 font-medium">
                        {formatDate(pledge.pledgeDate)}
                      </p>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">
                        {pledge.status !== "RELEASED" && pledge.durationMonths > 0 
                          ? `${pledge.durationMonths} Months Active` 
                          : "Closed & Settled"}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 text-xs font-semibold rounded-full border whitespace-nowrap ${getStatusColor(pledge.status)}`}
                    >
                      {getStatusText(pledge.status)}
                    </span>
                  </div>

                  <div className="space-y-3 flex-grow">
                    {pledge.status !== "RELEASED" ? (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Principal Loan:</span>
                          <span className="font-medium text-gray-900">
                            {formatCurrency(pledge.parsedLoanAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Accrued Interest:</span>
                          <span className="font-medium text-gray-900">
                            {formatCurrency(pledge.calculatedInterest)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full pt-2">
                        <span className="text-sm text-gray-400 italic">
                          Financial details are hidden for released items.
                        </span>
                      </div>
                    )}
                  </div>

                  {pledge.status !== "RELEASED" && (
                    <div className="mt-5 pt-4 border-t border-gray-100">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-700">
                          Total Due:
                        </span>
                        <span className="text-lg font-bold text-red-600">
                          {formatCurrency(pledge.calculatedDue)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}