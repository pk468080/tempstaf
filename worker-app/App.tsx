import {
  WorkerRuntimeProvider,
} from './context/WorkerRuntimeContext'

import RootNavigator from './navigation/RootNavigator'

export default function App() {
  return (
    <WorkerRuntimeProvider>
      <RootNavigator />
    </WorkerRuntimeProvider>
  )
}