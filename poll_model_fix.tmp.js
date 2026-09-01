const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  for (let i = 0; i < 40; i++) {
    const job = await prisma.igTemplateGenerationJob.findFirst({ where: { brandId: '09342ff1-6e0c-4365-ab6a-b6fe2c0de3f7' }, orderBy: { createdAt: 'desc' } });
    console.log(`poll ${i}: ${job.status}`);
    if (job.status === 'completed' || job.status === 'failed') {
      const log = await prisma.igCostLog.findFirst({ where: { entityId: job.id }, orderBy: { createdAt: 'desc' } });
      console.log('cost log:', JSON.stringify(log));
      break;
    }
    await new Promise(r => setTimeout(r, 15000));
  }
  await prisma.$disconnect();
}
main();
