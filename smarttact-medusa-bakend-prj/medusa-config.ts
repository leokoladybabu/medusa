import { loadEnv, defineConfig, Modules, ContainerRegistrationKeys } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

const dynamicModules = {
  [Modules.TAX]: {
     resolve: "@medusajs/medusa/tax",
     dependencies: ["remoteQuery"],
      options: {
        providers: [
          {
            resolve: "./src/modules/stripetax",
            id: "stripetax",
            options: {
              apiKey: process.env.STRIPE_API_KEY,
            },
          },
        ],
      },
  },
  [Modules.NOTIFICATION]:  {
      resolve: "@medusajs/medusa/notification",
      dependencies: ["remoteQuery"],
      options: {
        providers: [
          {
            resolve: "./src/modules/resend",
            id: "resend",
            options: {
              channels: ["email"],
              api_key: process.env.RESEND_API_KEY,
              from: process.env.RESEND_FROM_EMAIL,
            },
          },
        ],
      },
  },

  [Modules.AUTH]:  {
    resolve: "@medusajs/medusa/auth",
    dependencies: [Modules.CACHE, ContainerRegistrationKeys.LOGGER, Modules.CUSTOMER],
    options: {
      providers: [
        {
          resolve: "@medusajs/medusa/auth-emailpass",
          id: "emailpass",
          scope: ["admin"], // or ["admin"] or both
          options: {
            // Optional: You can set token TTLs here
          },
        },
        {
          resolve: "./src/modules/auth-google",
          id: "google",
          scope: ["store"],
          options: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackUrl: process.env.GOOGLE_CALLBACK_URL,
          },
        },
      ],
      actors: {
        customer: {
          providers: ["emailpass", "google"],
        },
      },
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

    ...(process.env.DO_SPACE_URL &&
  {
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
  } || {}),


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

  // [Modules.AUTH]:  {
  //   resolve: "@medusajs/medusa/auth",
  //   dependencies: [Modules.CACHE, ContainerRegistrationKeys.LOGGER],
  //   options: {
  //     providers: [
  //       {
  //         resolve: "@medusajs/medusa/auth-emailpass",
  //         id: "emailpass",
  //         scope: ["admin"], // or ["admin"] or both
  //         options: {
  //           // Optional: You can set token TTLs here
  //         },
  //       },
  //       {
  //         resolve: "@medusajs/medusa/auth-google",
  //         id: "google",
  //         scope: ["store"],
  //         options: {
  //           clientId: process.env.GOOGLE_CLIENT_ID,
  //           clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  //           callbackUrl: process.env.GOOGLE_CALLBACK_URL,
  //         },
  //       },
  //     ],
  //     actors: {
  //       customer: {
  //         providers: ["emailpass", "google"],
  //       },
  //     },
  //   },
  // }
  
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
