import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
const db=new PrismaClient();
async function main(){
 const passwordHash=await argon2.hash('DemoPass123!');
 const customer=await db.user.upsert({where:{email:'customer.demo@coopgig.test'},update:{},create:{name:'Demo Customer',email:'customer.demo@coopgig.test',passwordHash,role:'CUSTOMER'}});
 const worker=await db.user.upsert({where:{email:'worker.demo@coopgig.test'},update:{},create:{name:'Demo Worker',email:'worker.demo@coopgig.test',passwordHash,role:'WORKER',workerProfile:{create:{displayName:'Demo Worker',serviceCategories:['plumber','electrician'],serviceAreaText:'Kothrud, Pune',latitude:18.5074,longitude:73.8077,availabilityStatus:'AVAILABLE',verificationStatus:'PENDING'}}}});
 await db.user.upsert({where:{email:'admin.demo@coopgig.test'},update:{},create:{name:'Demo Admin',email:'admin.demo@coopgig.test',passwordHash,role:'ADMIN'}});
 console.log(`Seeded synthetic accounts: ${customer.email}, ${worker.email}`);
}
main().finally(()=>db.$disconnect());
