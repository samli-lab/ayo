import router from '@adonisjs/core/services/router'
const AiTestController = () => import('#controllers/ai_test_controller')

router
  .group(() => {
    router.post('/test/image', [AiTestController, 'imageGenerationTest'])
    router.get('/test/flash-chat', [AiTestController, 'flashChatTest'])
    router.get('/test/chat', [AiTestController, 'chatTest'])
  })
  .prefix('api/ai')

