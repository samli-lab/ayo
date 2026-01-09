import router from '@adonisjs/core/services/router'
const AiTestController = () => import('#controllers/ai_test_controller')

router
  .group(() => {
    router.post('/test/image', [AiTestController, 'imageGenerationTest'])
    router.get('/test/flash-chat', [AiTestController, 'flashChatTest'])
    router.get('/test/chat', [AiTestController, 'chatTest'])
    router.get('/test/agent', [AiTestController, 'agentTest'])
    router.get('/test/agent-stream', [AiTestController, 'agentStreamTest'])
    router.get('/test/multi-agent', [AiTestController, 'multiAgentTest'])
    router.get('/test/multi-agent-mock', [AiTestController, 'multiAgentMock'])
  })
  .prefix('api/ai')
