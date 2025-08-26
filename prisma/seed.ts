import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';

const prisma = new PrismaClient();

async function main() {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
    apiVersion: '2025-07-30.basil',
  });

  const products = await stripe.products.list({ active: true, expand: ['data.default_price'] });

  for (const product of products.data) {
    const price = product.default_price as Stripe.Price;

    if (!price || price?.unit_amount == null) {
      console.warn(`Skipping product ${product.name} — no price found`);
    }

    await prisma.subscriptionPlan.upsert({
      where: { stripeProductId: product.id },
      update: {
        name: product.name,
        description: product.description ?? '',
        price: price.unit_amount ?? 0,
        stripePriceId: price.id,
        active: product.active,
      },
      create: {
        name: product.name,
        description: product.description ?? '',
        price: price.unit_amount ?? 0,
        stripeProductId: product.id,
        stripePriceId: price.id,
        active: product.active,
      },
    });

    console.log(
      `Seeded product: ${product.name} ($${price.unit_amount! / 100}/${price.recurring?.interval})`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
