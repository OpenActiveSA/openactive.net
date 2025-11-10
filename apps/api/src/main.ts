import 'dotenv/config';

import cors from '@fastify/cors';
import Fastify from 'fastify';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: process.env.CORS_ALLOW_ORIGIN?.split(',') ?? ['http://localhost:3000', 'http://localhost:8081'],
  credentials: true,
});

app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

const userParamsSchema = z.object({
  username: z.string().min(1),
});

app.get('/users/:username', async (request, reply) => {
  const parseResult = userParamsSchema.safeParse(request.params);

  if (!parseResult.success) {
    reply.status(400);
    return { error: 'INVALID_PARAMS' };
  }

  const { username } = parseResult.data;

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      role: true,
    },
  });

  if (!user) {
    reply.status(404);
    return { error: 'USER_NOT_FOUND' };
  }

  return { user };
});

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? '0.0.0.0';

app
  .listen({ port, host })
  .then((address) => {
    app.log.info(`API listening on ${address}`);
  })
  .catch((error) => {
    app.log.error(error, 'Error starting server');
    process.exit(1);
  });

