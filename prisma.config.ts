import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: 'postgresql://postgres:TXTxdunCKhoPwbSxhFaBKwQXKNYvEaQs@mainline.proxy.rlwy.net:44815/railway',
  },
});
