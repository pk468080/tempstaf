import {
  WorkerRuntimeProvider,
} from './constants/WorkerRuntimeContext'

import RootNavigator from './navigation/RootNavigator'

export default function App() {
  return (
    <WorkerRuntimeProvider>
      <RootNavigator />
    </WorkerRuntimeProvider>
  )
}