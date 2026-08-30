import { redirect } from 'next/navigation';

// Hausaufgaben sind ein Tab im Dashboard. Alte Links leiten dorthin weiter.
export default function HomeworkRedirect() {
  redirect('/dashboard');
}
