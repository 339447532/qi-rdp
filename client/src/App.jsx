import { useRemoteControl } from './hooks/useRemoteControl'
import { DashboardPage } from './pages/DashboardPage'
import { RemoteSessionPage } from './pages/RemoteSessionPage'
import { SESSION_STATES } from './lib/protocol'

function App() {
  const remoteControl = useRemoteControl()

  const showRemoteSession =
    remoteControl.state === SESSION_STATES.CONNECTED ||
    remoteControl.state === SESSION_STATES.CONTROLLING ||
    remoteControl.state === SESSION_STATES.CONNECTING

  if (showRemoteSession) {
    return <RemoteSessionPage remoteControl={remoteControl} />
  }

  return <DashboardPage remoteControl={remoteControl} />
}

export default App
