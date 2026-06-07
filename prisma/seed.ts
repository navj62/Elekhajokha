import { PrismaClient, Gender, PledgeStatus, CompoundingDuration, ItemType, MetalType, AuditAction,RiskTier } from '@prisma/client';
import "dotenv/config"
import { PrismaNeon } from '@prisma/adapter-neon'
import ws from "ws"
import { neonConfig } from '@neondatabase/serverless'
const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
})
const prisma = new PrismaClient({ adapter })

neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket
// ─── Config ────────────────────────────────────────────────────────────────
const USER_ID   = '60a17a87-9af1-4135-b307-2b7525430bf2'
const GOLD_PPG  = 9500   // ₹ per gram (22K equivalent)
const SILVER_PPG = 110   // ₹ per gram
 
// ─── LTV helpers ────────────────────────────────────────────────────────────
function marketValue(goldGrams: number, silverGrams = 0) {
  return goldGrams * GOLD_PPG + silverGrams * SILVER_PPG
}
 
function loanForLtv(mv: number, ltvPercent: number) {
  return Math.round((mv * ltvPercent) / 100)
}
 
function riskTier(ltv: number): RiskTier {
  if (ltv < 60)  return RiskTier.SAFE
  if (ltv < 75)  return RiskTier.WATCH
  if (ltv < 90)  return RiskTier.AT_RISK
  return RiskTier.UNDERWATER
}
 
// ─── Customer + pledge definitions ──────────────────────────────────────────
//
//  LTV bands used below:
//    ~73–76 %  →  AT_RISK  (border of safe/risky, "closer to 75" as requested)
//    ~88–95 %  →  AT_RISK / UNDERWATER
//    >100 %    →  UNDERWATER
//
const CUSTOMERS: Array<{
  profile: { name: string; region: string; address: string; mobile: string; aadharNo: string; gender: Gender; remark: string }
  pledges: Array<{
    pledgeDate: Date
    goldGrams: number
    silverGrams?: number
    targetLtv: number          // used to derive loanAmount
    interestRate: number
    compoundingDuration: CompoundingDuration
    allowCompounding: boolean
    durationMonths: number
    status: PledgeStatus
    releaseDate?: Date
    itemType: ItemType
    metalType: MetalType
    itemName: string
    purity: number
    quantity: number
    remark: string
  }>
}> = [
  // ── 1 · LTV ~ 75% range ──────────────────────────────────────────────────
  {
    profile: {
      name: 'Harsh Gupta',
      region: 'Bhopal',
      address: '3, Arera Colony E-7, Bhopal, MP 462016',
      mobile: '9901234501',
      aadharNo: '3456-7890-1001',
      gender: Gender.Male,
      remark: 'LTV near threshold — monitor closely',
    },
    pledges: [
      {
        pledgeDate: new Date('2025-01-15'),
        goldGrams: 20, targetLtv: 74,
        interestRate: 2.5, compoundingDuration: CompoundingDuration.MONTHLY,
        allowCompounding: true, durationMonths: 6, status: PledgeStatus.ACTIVE,
        itemType: ItemType.NECKLACE, metalType: MetalType.GOLD,
        itemName: 'Gold Necklace 22K', purity: 91.67, quantity: 1,
        remark: 'LTV 74% — near watch zone',
      },
      {
        pledgeDate: new Date('2025-02-10'),
        goldGrams: 15, targetLtv: 76,
        interestRate: 2.75, compoundingDuration: CompoundingDuration.MONTHLY,
        allowCompounding: true, durationMonths: 4, status: PledgeStatus.ACTIVE,
        itemType: ItemType.BANGLE, metalType: MetalType.GOLD,
        itemName: 'Gold Bangles 22K', purity: 91.67, quantity: 2,
        remark: 'LTV 76% — AT_RISK',
      },
      {
        pledgeDate: new Date('2024-10-05'),
        goldGrams: 10, targetLtv: 73,
        interestRate: 2.0, compoundingDuration: CompoundingDuration.MONTHLY,
        allowCompounding: false, durationMonths: 3, status: PledgeStatus.RELEASED,
        releaseDate: new Date('2025-01-08'),
        itemType: ItemType.COIN, metalType: MetalType.GOLD,
        itemName: 'Gold Coin 22K', purity: 91.67, quantity: 1,
        remark: 'Released — was LTV 73%',
      },
    ],
  },
  // ── 2 ────────────────────────────────────────────────────────────────────
  {
    profile: {
      name: 'Nisha Trivedi',
      region: 'Indore',
      address: '22, Vijay Nagar, Indore, MP 452010',
      mobile: '9901234502',
      aadharNo: '3456-7890-1002',
      gender: Gender.Female,
      remark: 'Multiple active pledges near 75%',
    },
    pledges: [
      {
        pledgeDate: new Date('2025-01-20'),
        goldGrams: 25, targetLtv: 75,
        interestRate: 2.5, compoundingDuration: CompoundingDuration.HALFYEARLY,
        allowCompounding: true, durationMonths: 6, status: PledgeStatus.ACTIVE,
        itemType: ItemType.CHAIN, metalType: MetalType.GOLD,
        itemName: 'Gold Chain 22K', purity: 91.67, quantity: 1,
        remark: 'LTV exactly 75%',
      },
      {
        pledgeDate: new Date('2025-03-01'),
        goldGrams: 12, targetLtv: 74,
        interestRate: 2.25, compoundingDuration: CompoundingDuration.MONTHLY,
        allowCompounding: true, durationMonths: 3, status: PledgeStatus.ACTIVE,
        itemType: ItemType.EARRING, metalType: MetalType.GOLD,
        itemName: 'Gold Earrings 22K', purity: 91.67, quantity: 1,
        remark: 'LTV 74% — near threshold',
      },
      {
        pledgeDate: new Date('2025-02-14'),
        goldGrams: 8, targetLtv: 76,
        interestRate: 2.75, compoundingDuration: CompoundingDuration.MONTHLY,
        allowCompounding: true, durationMonths: 3, status: PledgeStatus.OVERDUE,
        itemType: ItemType.RING, metalType: MetalType.GOLD,
        itemName: 'Gold Ring 22K', purity: 91.67, quantity: 1,
        remark: 'OVERDUE — LTV 76%',
      },
    ],
  },
  // ── 3 ────────────────────────────────────────────────────────────────────
  {
    profile: {
      name: 'Bharat Saxena',
      region: 'Jabalpur',
      address: '11, Napier Town, Jabalpur, MP 482001',
      mobile: '9901234503',
      aadharNo: '3456-7890-1003',
      gender: Gender.Male,
      remark: 'Gold + silver mix, mid-risk',
    },
    pledges: [
      {
        pledgeDate: new Date('2025-01-08'),
        goldGrams: 18, silverGrams: 50, targetLtv: 75,
        interestRate: 2.5, compoundingDuration: CompoundingDuration.MONTHLY,
        allowCompounding: true, durationMonths: 6, status: PledgeStatus.ACTIVE,
        itemType: ItemType.NECKLACE, metalType: MetalType.GOLD,
        itemName: 'Gold Necklace + Silver Set', purity: 91.67, quantity: 1,
        remark: 'Mixed pledge — LTV 75%',
      },
      {
        pledgeDate: new Date('2025-02-22'),
        goldGrams: 22, targetLtv: 73,
        interestRate: 2.0, compoundingDuration: CompoundingDuration.HALFYEARLY,
        allowCompounding: true, durationMonths: 9, status: PledgeStatus.ACTIVE,
        itemType: ItemType.BRACELET, metalType: MetalType.GOLD,
        itemName: 'Gold Bracelet 22K', purity: 91.67, quantity: 1,
        remark: 'LTV 73% — WATCH',
      },
      {
        pledgeDate: new Date('2024-09-15'),
        goldGrams: 14, targetLtv: 70,
        interestRate: 2.0, compoundingDuration: CompoundingDuration.MONTHLY,
        allowCompounding: false, durationMonths: 4, status: PledgeStatus.RELEASED,
        releaseDate: new Date('2025-01-20'),
        itemType: ItemType.PENDANT, metalType: MetalType.GOLD,
        itemName: 'Gold Pendant 22K', purity: 91.67, quantity: 1,
        remark: 'Released — LTV was 70%',
      },
    ],
  },
  // ── 4 ────────────────────────────────────────────────────────────────────
  {
    profile: {
      name: 'Divya Shukla',
      region: 'Rewa',
      address: '17, Civil Lines, Rewa, MP 486001',
      mobile: '9901234504',
      aadharNo: '3456-7890-1004',
      gender: Gender.Female,
      remark: 'Seasonal pledger, all near 75%',
    },
    pledges: [
      {
        pledgeDate: new Date('2025-02-01'),
        goldGrams: 30, targetLtv: 76,
        interestRate: 3.0, compoundingDuration: CompoundingDuration.MONTHLY,
        allowCompounding: true, durationMonths: 6, status: PledgeStatus.ACTIVE,
        itemType: ItemType.BANGLE, metalType: MetalType.GOLD,
        itemName: 'Bridal Bangle Set 22K', purity: 91.67, quantity: 4,
        remark: 'High-value pledge LTV 76%',
      },
      {
        pledgeDate: new Date('2025-03-10'),
        goldGrams: 9, targetLtv: 74,
        interestRate: 2.5, compoundingDuration: CompoundingDuration.MONTHLY,
        allowCompounding: true, durationMonths: 3, status: PledgeStatus.ACTIVE,
        itemType: ItemType.RING, metalType: MetalType.GOLD,
        itemName: 'Gold Ring 22K', purity: 91.67, quantity: 2,
        remark: 'LTV 74%',
      },
      {
        pledgeDate: new Date('2025-01-25'),
        goldGrams: 16, targetLtv: 75,
        interestRate: 2.75, compoundingDuration: CompoundingDuration.MONTHLY,
        allowCompounding: true, durationMonths: 5, status: PledgeStatus.ACTIVE,
        itemType: ItemType.CHAIN, metalType: MetalType.GOLD,
        itemName: 'Gold Chain 22K', purity: 91.67, quantity: 1,
        remark: 'LTV 75% — AT_RISK',
      },
    ],
  },
  // ── 5 · LTV ~88–95% range ────────────────────────────────────────────────
  {
    profile: {
      name: 'Rajan Pathak',
      region: 'Satna',
      address: '6, New Colony, Satna, MP 485001',
      mobile: '9901234505',
      aadharNo: '3456-7890-1005',
      gender: Gender.Male,
      remark: 'High LTV — at risk of default',
    },
    pledges: [
      {
        pledgeDate: new Date('2024-11-10'),
        goldGrams: 20, targetLtv: 88,
        interestRate: 3.0, compoundingDuration: CompoundingDuration.MONTHLY,
        allowCompounding: true, durationMonths: 8, status: PledgeStatus.OVERDUE,
        itemType: ItemType.NECKLACE, metalType: MetalType.GOLD,
        itemName: 'Gold Necklace 22K', purity: 91.67, quantity: 1,
        remark: 'OVERDUE — LTV 88% AT_RISK',
      },
      {
        pledgeDate: new Date('2024-10-20'),
        goldGrams: 15, targetLtv: 92,
        interestRate: 3.0, compoundingDuration: CompoundingDuration.MONTHLY,
        allowCompounding: true, durationMonths: 6, status: PledgeStatus.OVERDUE,
        itemType: ItemType.BANGLE, metalType: MetalType.GOLD,
        itemName: 'Gold Bangles 22K', purity: 91.67, quantity: 2,
        remark: 'OVERDUE — LTV 92% UNDERWATER',
      },
      {
        pledgeDate: new Date('2025-01-05'),
        goldGrams: 10, targetLtv: 85,
        interestRate: 2.75, compoundingDuration: CompoundingDuration.MONTHLY,
        allowCompounding: true, durationMonths: 4, status: PledgeStatus.ACTIVE,
        itemType: ItemType.COIN, metalType: MetalType.GOLD,
        itemName: 'Gold Coin 24K', purity: 99.5, quantity: 1,
        remark: 'Active but high LTV 85%',
      },
    ],
  },
  // ── 6 ────────────────────────────────────────────────────────────────────
  {
    profile: {
      name: 'Sarla Pandey',
      region: 'Gwalior',
      address: '9, Thatipur, Gwalior, MP 474011',
      mobile: '9901234506',
      aadharNo: '3456-7890-1006',
      gender: Gender.Female,
      remark: 'Two pledges underwater',
    },
    pledges: [
      {
        pledgeDate: new Date('2024-08-15'),
        goldGrams: 12, targetLtv: 90,
        interestRate: 3.0, compoundingDuration: CompoundingDuration.MONTHLY,
        allowCompounding: true, durationMonths: 9, status: PledgeStatus.OVERDUE,
        itemType: ItemType.CHAIN, metalType: MetalType.GOLD,
        itemName: 'Gold Chain 22K', purity: 91.67, quantity: 1,
        remark: 'Long overdue — LTV 90%',
      },
      {
        pledgeDate: new Date('2025-01-12'),
        goldGrams: 18, targetLtv: 76,
        interestRate: 2.5, compoundingDuration: CompoundingDuration.MONTHLY,
        allowCompounding: true, durationMonths: 5, status: PledgeStatus.ACTIVE,
        itemType: ItemType.BANGLE, metalType: MetalType.GOLD,
        itemName: 'Gold Bangles 22K', purity: 91.67, quantity: 2,
        remark: 'Active — LTV 76%',
      },
      {
        pledgeDate: new Date('2024-07-01'),
        goldGrams: 8, targetLtv: 68,
        interestRate: 2.0, compoundingDuration: CompoundingDuration.HALFYEARLY,
        allowCompounding: false, durationMonths: 5, status: PledgeStatus.RELEASED,
        releaseDate: new Date('2024-12-05'),
        itemType: ItemType.RING, metalType: MetalType.GOLD,
        itemName: 'Gold Ring 22K', purity: 91.67, quantity: 1,
        remark: 'Released — was LTV 68%',
      },
    ],
  },
  // ── 7 · LTV > 100% ───────────────────────────────────────────────────────
  {
    profile: {
      name: 'Vikram Chouhan',
      region: 'Ujjain',
      address: '27, Mahakal Road, Ujjain, MP 456001',
      mobile: '9901234507',
      aadharNo: '3456-7890-1007',
      gender: Gender.Male,
      remark: 'UNDERWATER — loan exceeds gold value',
    },
    pledges: [
      {
        pledgeDate: new Date('2024-06-10'),
        goldGrams: 15, targetLtv: 108,   // loan > market value
        interestRate: 3.5, compoundingDuration: CompoundingDuration.MONTHLY,
        allowCompounding: true, durationMonths: 10, status: PledgeStatus.OVERDUE,
        itemType: ItemType.NECKLACE, metalType: MetalType.GOLD,
        itemName: 'Gold Necklace 22K', purity: 91.67, quantity: 1,
        remark: 'CRITICAL — LTV 108% UNDERWATER',
      },
      {
        pledgeDate: new Date('2024-07-20'),
        goldGrams: 10, targetLtv: 105,
        interestRate: 3.0, compoundingDuration: CompoundingDuration.MONTHLY,
        allowCompounding: true, durationMonths: 7, status: PledgeStatus.OVERDUE,
        itemType: ItemType.BANGLE, metalType: MetalType.GOLD,
        itemName: 'Gold Bangles 22K', purity: 91.67, quantity: 2,
        remark: 'OVERDUE — LTV 105%',
      },
      {
        pledgeDate: new Date('2025-02-05'),
        goldGrams: 20, targetLtv: 77,
        interestRate: 2.75, compoundingDuration: CompoundingDuration.MONTHLY,
        allowCompounding: true, durationMonths: 6, status: PledgeStatus.ACTIVE,
        itemType: ItemType.CHAIN, metalType: MetalType.GOLD,
        itemName: 'Gold Chain 22K', purity: 91.67, quantity: 1,
        remark: 'New pledge — LTV 77%',
      },
    ],
  },
  // ── 8 ────────────────────────────────────────────────────────────────────
  {
    profile: {
      name: 'Kamla Yadav',
      region: 'Sagar',
      address: '5, Makronia, Sagar, MP 470004',
      mobile: '9901234508',
      aadharNo: '3456-7890-1008',
      gender: Gender.Female,
      remark: 'All pledges underwater or near 100%',
    },
    pledges: [
      {
        pledgeDate: new Date('2024-05-01'),
        goldGrams: 18, targetLtv: 112,
        interestRate: 3.5, compoundingDuration: CompoundingDuration.MONTHLY,
        allowCompounding: true, durationMonths: 12, status: PledgeStatus.OVERDUE,
        itemType: ItemType.NECKLACE, metalType: MetalType.GOLD,
        itemName: 'Gold Necklace 22K', purity: 91.67, quantity: 1,
        remark: 'CRITICAL — LTV 112%',
      },
      {
        pledgeDate: new Date('2024-09-10'),
        goldGrams: 12, targetLtv: 103,
        interestRate: 3.0, compoundingDuration: CompoundingDuration.MONTHLY,
        allowCompounding: true, durationMonths: 8, status: PledgeStatus.OVERDUE,
        itemType: ItemType.BANGLE, metalType: MetalType.GOLD,
        itemName: 'Gold Bangles 22K', purity: 91.67, quantity: 2,
        remark: 'OVERDUE — LTV 103%',
      },
      {
        pledgeDate: new Date('2025-01-30'),
        goldGrams: 14, targetLtv: 75,
        interestRate: 2.5, compoundingDuration: CompoundingDuration.MONTHLY,
        allowCompounding: true, durationMonths: 4, status: PledgeStatus.ACTIVE,
        itemType: ItemType.CHAIN, metalType: MetalType.GOLD,
        itemName: 'Gold Chain 22K', purity: 91.67, quantity: 1,
        remark: 'Newer pledge — LTV 75%',
      },
    ],
  },
  // ── 9 ────────────────────────────────────────────────────────────────────
  {
    profile: {
      name: 'Pramod Tiwari',
      region: 'Chhindwara',
      address: '14, Mohgaon Road, Chhindwara, MP 480001',
      mobile: '9901234509',
      aadharNo: '3456-7890-1009',
      gender: Gender.Male,
      remark: 'Mix of safe and underwater',
    },
    pledges: [
      {
        pledgeDate: new Date('2024-04-15'),
        goldGrams: 20, targetLtv: 118,   // well underwater
        interestRate: 3.5, compoundingDuration: CompoundingDuration.MONTHLY,
        allowCompounding: true, durationMonths: 12, status: PledgeStatus.OVERDUE,
        itemType: ItemType.NECKLACE, metalType: MetalType.GOLD,
        itemName: 'Gold Necklace 22K', purity: 91.67, quantity: 1,
        remark: 'CRITICAL — LTV 118%',
      },
      {
        pledgeDate: new Date('2025-02-28'),
        goldGrams: 16, targetLtv: 74,
        interestRate: 2.5, compoundingDuration: CompoundingDuration.MONTHLY,
        allowCompounding: true, durationMonths: 5, status: PledgeStatus.ACTIVE,
        itemType: ItemType.BANGLE, metalType: MetalType.GOLD,
        itemName: 'Gold Bangles 22K', purity: 91.67, quantity: 2,
        remark: 'New pledge — LTV 74%',
      },
      {
        pledgeDate: new Date('2024-11-01'),
        goldGrams: 11, targetLtv: 55,
        interestRate: 2.0, compoundingDuration: CompoundingDuration.MONTHLY,
        allowCompounding: false, durationMonths: 3, status: PledgeStatus.RELEASED,
        releaseDate: new Date('2025-02-10'),
        itemType: ItemType.RING, metalType: MetalType.GOLD,
        itemName: 'Gold Ring 22K', purity: 91.67, quantity: 1,
        remark: 'Released safely — LTV 55%',
      },
    ],
  },
  // ── 10 ───────────────────────────────────────────────────────────────────
  {
    profile: {
      name: 'Lata Verma',
      region: 'Datia',
      address: '3, Bus Stand Road, Datia, MP 475661',
      mobile: '9901234510',
      aadharNo: '3456-7890-1010',
      gender: Gender.Female,
      remark: 'Highest risk customer — all pledges underwater',
    },
    pledges: [
      {
        pledgeDate: new Date('2024-03-10'),
        goldGrams: 25, targetLtv: 122,
        interestRate: 3.5, compoundingDuration: CompoundingDuration.MONTHLY,
        allowCompounding: true, durationMonths: 14, status: PledgeStatus.OVERDUE,
        itemType: ItemType.NECKLACE, metalType: MetalType.GOLD,
        itemName: 'Gold Necklace 22K', purity: 91.67, quantity: 1,
        remark: 'CRITICAL — LTV 122%',
      },
      {
        pledgeDate: new Date('2024-06-25'),
        goldGrams: 16, targetLtv: 107,
        interestRate: 3.0, compoundingDuration: CompoundingDuration.MONTHLY,
        allowCompounding: true, durationMonths: 9, status: PledgeStatus.OVERDUE,
        itemType: ItemType.BANGLE, metalType: MetalType.GOLD,
        itemName: 'Gold Bangles 22K', purity: 91.67, quantity: 2,
        remark: 'OVERDUE — LTV 107%',
      },
      {
        pledgeDate: new Date('2025-03-01'),
        goldGrams: 13, targetLtv: 76,
        interestRate: 2.75, compoundingDuration: CompoundingDuration.MONTHLY,
        allowCompounding: true, durationMonths: 4, status: PledgeStatus.ACTIVE,
        itemType: ItemType.CHAIN, metalType: MetalType.GOLD,
        itemName: 'Gold Chain 22K', purity: 91.67, quantity: 1,
        remark: 'Latest pledge — LTV 76%',
      },
    ],
  },
]
 
// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Seeding 10 customers with LTV-targeted pledges...\n')
  console.log(`   Gold  price : ₹${GOLD_PPG}/g`)
  console.log(`   Silver price: ₹${SILVER_PPG}/g\n`)
 
  const user = await prisma.user.findUnique({ where: { id: USER_ID } })
  if (!user) throw new Error(`User ${USER_ID} not found.`)
  console.log(`✅ Found user: ${user.username ?? user.email}\n`)
 
  for (const { profile, pledges } of CUSTOMERS) {
    const customer = await prisma.customer.create({
      data: { userId: USER_ID, ...profile },
    })
    console.log(`👤 ${customer.name} (${customer.id})`)
 
    for (const p of pledges) {
      const mv      = marketValue(p.goldGrams, p.silverGrams ?? 0)
      const loan    = loanForLtv(mv, p.targetLtv)
      const ltv     = p.targetLtv
      const tier    = riskTier(ltv)
      const grossW  = +(p.goldGrams * 1.05).toFixed(3)   // gross ≈ 5% heavier
      const netWt   = +(p.goldGrams * 1.02).toFixed(3)
 
      const pledge = await prisma.pledge.create({
        data: {
          customerId:         customer.id,
          pledgeDate:         p.pledgeDate,
          loanAmount:         loan,
          interestRate:       p.interestRate,
          compoundingDuration: p.compoundingDuration,
          allowCompounding:   p.allowCompounding,
          durationMonths:     p.durationMonths,
          status:             p.status,
          releaseDate:        p.releaseDate ?? null,
          netWeightOfGold:    p.metalType === MetalType.GOLD ? p.goldGrams : 0,
          netWeightOfSilver:  p.silverGrams ?? 0,
          remark:             p.remark,
          calculationVersion: 1,
          // LTV snapshot fields
          lastCalculatedLtv:  ltv,
          lastRiskTier:       tier,
          lastEvaluatedAt:    new Date(),
          lastAmountOwed:     loan,
          lastMarketValue:    mv,
        },
      })
 
      // Pledge item
      await prisma.pledgeItem.create({
        data: {
          pledgeId:        pledge.id,
          itemType:        p.itemType,
          metalType:       p.metalType,
          itemName:        p.itemName,
          quantity:        p.quantity,
          grossWeight:     grossW,
          netWeight:       netWt,
          purity:          p.purity,
          netWeightOfMetal: p.goldGrams,
        },
      })
 
      // Pledge audit
      await prisma.pledgeAudit.create({
        data: {
          pledgeId:           pledge.id,
          action:             AuditAction.CREATED,
          principal:          loan,
          interestRate:       p.interestRate,
          allowCompounding:   p.allowCompounding,
          compoundingDuration: p.compoundingDuration,
          calculationVersion: 1,
          durationMonths:     p.durationMonths,
          netWeightOfGold:    p.metalType === MetalType.GOLD ? p.goldGrams : 0,
          netWeightOfSilver:  p.silverGrams ?? 0,
          releaseDate:        p.releaseDate ?? null,
        },
      })
 
      const flag = ltv >= 100 ? '🔴' : ltv >= 75 ? '🟠' : '🟢'
      console.log(
        `  ${flag} ₹${loan.toLocaleString('en-IN').padStart(9)} | LTV ${ltv}% | ${tier.padEnd(10)} | ${p.status}`
      )
    }
    console.log('')
  }
 
  console.log('✅ Done! LTV summary:')
  console.log('   🟢 SAFE/WATCH  < 75%')
  console.log('   🟠 AT_RISK    75–99%')
  console.log('   🔴 UNDERWATER ≥ 100%')
}
 
main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
 