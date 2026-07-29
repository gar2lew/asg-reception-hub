import { Component } from 'react';
interface Props { children: React.ReactNode; widgetKey: string; widgetLabel: string; }
interface State { error: Error | null; }
export class WidgetErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return <div style={{ padding: 16, border: '1px solid #ddd3c3', borderRadius: 8, background: '#fffdf8', color: '#746f67', fontSize: 13 }}>
        <strong style={{ color: '#b33c2f' }}>{this.props.widgetLabel}</strong>
        <p style={{ margin: '4px 0 0' }}>This widget could not load.</p>
      </div>;
    }
    return this.props.children;
  }
}
