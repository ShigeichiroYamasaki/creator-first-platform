import DefaultTheme from 'vitepress/theme'
import { defineAsyncComponent } from 'vue'
import CreatorRegistrationDemo from './CreatorRegistrationDemo.vue'
import CreatorWorkspaceDemo from './CreatorWorkspaceDemo.vue'
import DemoServiceChoices from './DemoServiceChoices.vue'
import MermaidDiagram from './MermaidDiagram.vue'
import TestUserRegistrationDemo from './TestUserRegistrationDemo.vue'
import TreasuryFlowDemo from './TreasuryFlowDemo.vue'
import UserServiceDemo from './UserServiceDemo.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('CreatorRegistrationDemo', CreatorRegistrationDemo)
    app.component('CreatorWorkspaceDemo', CreatorWorkspaceDemo)
    app.component('DemoServiceChoices', DemoServiceChoices)
    app.component('MermaidDiagram', MermaidDiagram)
    app.component('TestUserRegistrationDemo', TestUserRegistrationDemo)
    app.component('TestnetUserJourneyDemo', defineAsyncComponent(() => import('./TestnetUserJourneyDemo.vue')))
    app.component('TreasuryFlowDemo', TreasuryFlowDemo)
    app.component('UserServiceDemo', UserServiceDemo)
  }
}
