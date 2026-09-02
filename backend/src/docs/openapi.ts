import swaggerJsdoc from 'swagger-jsdoc';
import { env } from '../config/env';

export const openapiSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Moblytix API',
      version: '1.0.0',
      description:
        'Moblytix — plataforma de backend para gestao de mobilidade urbana: monitoramento de ' +
        'transporte publico, controle de trafego, gestao de incidentes, cadastros centrais e ' +
        'relatorios urbanos. Dados espaciais armazenados em PostgreSQL com a extensao PostGIS.',
    },
    servers: [{ url: env.API_PREFIX, description: 'API atual' }],
    tags: [
      { name: 'Auth', description: 'Autenticacao e emissao de tokens' },
      { name: 'Visao Geral', description: 'Indicadores de desempenho (KPIs)' },
      { name: 'Transporte Publico', description: 'Monitoramento e rastreamento de rotas/veiculos' },
      { name: 'Trafego', description: 'Controle de trafego de veiculos via sensores' },
      { name: 'Incidentes', description: 'Gestao de incidentes na via' },
      { name: 'Cadastros', description: 'Cadastros centrais de linhas, veiculos e usuarios' },
      { name: 'Relatorios Urbanos', description: 'Relatorios de pontualidade e lentidao' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  apis: ['./src/modules/**/*.controller.ts', './dist/modules/**/*.controller.js'],
});
