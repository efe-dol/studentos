/**
 * Berechnet den Durchschnitt der Noten basierend auf dem System:
 * KL (Kleine Leistungsnachweise): Mündlich, Kurzarbeit, KSL
 * GL (Große Leistungsnachweise): Schulaufgabe (2x zählen)
 * 
 * Fach-Durchschnitt = (KL-Durchschnitt + GL-Durchschnitt) / 2
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
 * Schulaufgaben zählen 2x (doppeltes Gewicht)
 */
export function calculateGLAverage(grades: Grade[]): number | null {
  const glGrades = grades.filter(g => g.grade_type === 'SCHULAUFGABE');
  
  if (glGrades.length === 0) return null;

  // Schulaufgaben zählen 2x
  const sum = glGrades.reduce((acc, grade) => acc + grade.grade * grade.weight * 2, 0);
  const totalWeight = glGrades.reduce((acc, grade) => acc + grade.weight * 2, 0);

  return sum / totalWeight;
}

/**
 * Berechnet den Durchschnitt für ein einzelnes Fach
 */
export function calculateSubjectAverage(grades: Grade[]): number | null {
  const klAvg = calculateKLAverage(grades);
  const glAvg = calculateGLAverage(grades);

  // Wenn beide vorhanden sind, durchschnitt der beiden
  if (klAvg !== null && glAvg !== null) {
    return (klAvg + glAvg) / 2;
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
      average: calculateSubjectAverage(subject.grades || []),
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
