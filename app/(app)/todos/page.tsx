import { redirect } from 'next/navigation';

// ToDos ist jetzt ein Tab im Dashboard. Alte Links/PWA-Shortcuts hierher
// leiten dorthin weiter.
export default function TodosRedirect() {
  redirect('/dashboard');
}
