import DefaultTheme from 'vitepress/theme'
import { defineAsyncComponent } from 'vue'
import CreatorRegistrationDemo from './CreatorRegistrationDemo.vue'
import CreatorWorkspaceDemo from './CreatorWorkspaceDemo.vue'
import DemoServiceChoices from './DemoServiceChoices.vue'
import MermaidDiagram from './MermaidDiagram.vue'
import TestUserRegistrationDemo from './TestUserRegistrationDemo.vue'
import TestnetGovernanceDemo from './TestnetGovernanceDemo.vue'
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
    app.component('TestnetGovernanceDemo', TestnetGovernanceDemo)
    app.component('TestnetUserJourneyDemo', defineAsyncComponent(() => import('./TestnetUserJourneyDemo.vue')))
    app.component('AccountTrustDemo', defineAsyncComponent(() => import('./AccountTrustDemo.vue')))
    app.component('TestnetCreatorJourneyDemo', defineAsyncComponent(() => import('./TestnetCreatorJourneyDemo.vue')))
    app.component('TreasuryFlowDemo', TreasuryFlowDemo)
    app.component('UserServiceDemo', UserServiceDemo)
    app.component('ParticipantAdminDemo', defineAsyncComponent(() => import('./ParticipantAdminDemo.vue')))
    app.component('ParticipantInvitationRegistration', defineAsyncComponent(() => import('./ParticipantInvitationRegistration.vue')))
  }
}
