/**
 * Berechnet den Durchschnitt der Noten basierend auf dem System:
 * KL (Kleine Leistungsnachweise): Mündlich, Kurzarbeit, Stegreifaufgabe
 * GL (Große Leistungsnachweise): Schulaufgabe
 *
 * Fach-Durchschnitt mit doppelter Schulaufgabe:  (KL + 2 * GL) / 3
 * Fach-Durchschnitt mit einfacher Schulaufgabe:  (KL + GL) / 2
 *
 * Ob die Schulaufgabe doppelt zählt, entscheidet das Fach (subject.sa_double,
 * Standard: true). Deutsch/Mathe/Englisch zählen doppelt, Physik/Chemie z. B.
 * einfach.
 */

export interface Grade {
  id: string;
  grade: number;
  grade_type: 'SCHULAUFGABE' | 'MÜNDLICH' | 'KURZARBEIT' | 'KSL';
  weight: number;
}

export interface Subject {
  id: string;
  name: string;
  type: 'HAUPTFACH' | 'NEBENFACH';
  color: string;
  /** Ob die Schulaufgaben doppelt gewichtet werden. Standard: true. */
  sa_double?: boolean;
  grades?: Grade[];
}

/**
 * Berechnet den Durchschnitt für kleine Leistungsnachweise (KL)
 */
export function calculateKLAverage(grades: Grade[]): number | null {
  const klGrades = grades.filter(g => ['MÜNDLICH', 'KURZARBEIT', 'KSL'].includes(g.grade_type));
  
  if (klGrades.length === 0) return null;

  const sum = klGrades.reduce((acc, grade) => acc + grade.grade * grade.weight, 0);
  const totalWeight = klGrades.reduce((acc, grade) => acc + grade.weight, 0);

  return sum / totalWeight;
}

/**
 * Berechnet den Durchschnitt für große Leistungsnachweise (GL)
 */
export function calculateGLAverage(grades: Grade[]): number | null {
  const glGrades = grades.filter(g => g.grade_type === 'SCHULAUFGABE');
  
  if (glGrades.length === 0) return null;

  const sum = glGrades.reduce((acc, grade) => acc + grade.grade * grade.weight, 0);
  const totalWeight = glGrades.reduce((acc, grade) => acc + grade.weight, 0);

  return sum / totalWeight;
}

/**
 * Berechnet den Durchschnitt für ein einzelnes Fach.
 * @param saDouble  ob die Schulaufgabe doppelt gewichtet wird (Standard: true)
 */
export function calculateSubjectAverage(
  grades: Grade[],
  saDouble: boolean = true
): number | null {
  const klAvg = calculateKLAverage(grades);
  const glAvg = calculateGLAverage(grades);

  // Beide vorhanden: Schulaufgabe je nach Fach doppelt oder einfach.
  if (klAvg !== null && glAvg !== null) {
    return saDouble ? (klAvg + 2 * glAvg) / 3 : (klAvg + glAvg) / 2;
  }

  // Wenn nur eines vorhanden, das zurückgeben
  if (klAvg !== null) return klAvg;
  if (glAvg !== null) return glAvg;

  // Kein Durchschnitt berechenbar
  return null;
}

/**
 * Berechnet den Gesamtdurchschnitt über alle Fächer
 */
export function calculateOverallAverage(subjects: Subject[]): number | null {
  const averages = subjects
    .map(subject => ({
      average: calculateSubjectAverage(subject.grades || [], subject.sa_double ?? true),
      subject,
    }))
    .filter(item => item.average !== null);

  if (averages.length === 0) return null;

  const sum = averages.reduce((acc, item) => acc + (item.average as number), 0);
  return sum / averages.length;
}

/**
 * Gibt eine Schulnote als text zurück (sehr gut, gut, etc.)
 */
export function getGradeLabel(grade: number): string {
  if (grade <= 1.5) return 'Sehr gut';
  if (grade <= 2.5) return 'Gut';
  if (grade <= 3.5) return 'Befriedigend';
  if (grade <= 4.5) return 'Ausreichend';
  if (grade <= 5.5) return 'Mangelhaft';
  return 'Ungenügend';
}

/**
 * Formatiert eine Note für die Anzeige
 */
export function formatGrade(grade: number | null): string {
  if (grade === null) return '-';
  return grade.toFixed(1);
}

/**
 * Formatiert Durchschnittswerte immer mit 2 Nachkommastellen
 */
export function formatAverageGrade(grade: number | null): string {
  if (grade === null) return '-';
  return grade.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
