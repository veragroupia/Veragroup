import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Os testes de horário assumem o fuso de Brasília, como a equipe.
    env: { TZ: 'America/Sao_Paulo' },
  },
})
