import { Redirect } from 'expo-router'

export default function HabitsIndexRedirect() {
  return <Redirect href={'/(tabs)/habits' as never} />
}
