import { Component, type ReactNode } from 'react'

// Keep drawing failures inside the scene; conventional controls remain mounted.
export class HallSceneBoundary extends Component<{ children: ReactNode; fallback?: string }, { failed: boolean }> {
 state = { failed: false }
 static getDerivedStateFromError() { return { failed: true } }
 render() { return this.state.failed ? <p role="status">{this.props.fallback ?? 'The hall scene could not load. Channel controls, announcements and chat are still available.'}</p> : this.props.children }
}
