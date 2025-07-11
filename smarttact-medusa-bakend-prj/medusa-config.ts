import { loadEnv, defineConfig, Modules } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const dynamicModules = {
  taxcode:{
    resolve: "./src/modules/taxcode",
  },
  taxjar: {
     resolve: "@medusajs/medusa/tax",
      dependencies: ["remoteQuery"],
      options: {
        providers: [
          {
            resolve: "./src/modules/taxjar",
            id: "tax-jar-provider",
            options: {
              apiKey: process.env.TAXJAR_API_KEY,
              defaultTaxcode: process.env.TAXJAR_DEFAULT_TAXCODE,
            },
          },
        ],
      },
  }
};

const stripeApiKey = process.env.STRIPE_API_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const isStripeConfigured = Boolean(stripeApiKey) && Boolean(stripeWebhookSecret);

if (isStripeConfigured) {
  console.log('Stripe API key and webhook secret found. Enabling payment module');
  dynamicModules[Modules.PAYMENT] = {
    resolve: '@medusajs/medusa/payment',
    options: {
      providers: [
        {
          resolve: '@medusajs/medusa/payment-stripe',
          id: 'stripe',
          options: {
            apiKey: stripeApiKey,
            webhookSecret: stripeWebhookSecret,
            capture: true,
          },
        },
      ],
    },
  };
}

const modules = {

  [Modules.FILE]: {
    resolve: '@medusajs/medusa/file',
    options: {
      providers: [
        {
          resolve: '@medusajs/file-s3',
          id: 's3',
          options: {
            file_url: process.env.DO_SPACE_URL,
            access_key_id: process.env.DO_SPACE_ACCESS_KEY,
            secret_access_key: process.env.DO_SPACE_SECRET_KEY,
            region: process.env.DO_SPACE_REGION,
            bucket: process.env.DO_SPACE_BUCKET,
            endpoint: process.env.DO_SPACE_ENDPOINT,
          },
        },
      ],
    },
  },

  [Modules.CACHE]: {
    resolve: '@medusajs/medusa/cache-redis',
    options: {
      redisUrl: process.env.REDIS_URL,
    },
  },
  [Modules.EVENT_BUS]: {
    resolve: '@medusajs/medusa/event-bus-redis',
    options: {
      redisUrl: process.env.REDIS_URL,
    },
  },
  [Modules.WORKFLOW_ENGINE]: {
    resolve: '@medusajs/medusa/workflow-engine-redis',
    options: {
      redis: {
        url: process.env.REDIS_URL,
      },
    },
  },
};

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
	redisUrl: process.env.REDIS_URL,
	workerMode: process.env.MEDUSA_WORKER_MODE as "shared" | "worker" | "server",
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",	  
    }
  },
  admin: {
    vite: () => {
      return {
        server: {
          allowedHosts: ["smarttract.up.railway.app"], // replace ".medusa-server-testing.com" with ".yourdomain.com"
        },
      };
    },
    backendUrl: process.env.MEDUSA_BACKEND_URL,
    disable: process.env.DISABLE_MEDUSA_ADMIN === "true"
  },

  modules: {
    ...modules,
    ...dynamicModules,
  },
})
