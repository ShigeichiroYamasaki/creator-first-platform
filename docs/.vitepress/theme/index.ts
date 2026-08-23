import DefaultTheme from 'vitepress/theme'
import MermaidDiagram from './MermaidDiagram.vue'
import TestUserRegistrationDemo from './TestUserRegistrationDemo.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('MermaidDiagram', MermaidDiagram)
    app.component('TestUserRegistrationDemo', TestUserRegistrationDemo)
  }
}
