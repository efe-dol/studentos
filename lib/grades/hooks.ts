import { useCallback, useState } from 'react';

export interface Subject {
  id: string;
  user_id: string;
  name: string;
  type: 'HAUPTFACH' | 'NEBENFACH';
  color: string;
  sa_double: boolean;
  default_room: string | null;
  default_teacher: string | null;
  created_at: string;
  updated_at: string;
}

export interface Grade {
  id: string;
  subject_id: string;
  user_id: string;
  grade: number;
  grade_type: 'SCHULAUFGABE' | 'MÜNDLICH' | 'KURZARBEIT' | 'KSL';
  weight: number;
  description?: string;
  grade_date: string;
  created_at: string;
  updated_at: string;
}

export const useSubjects = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/subjects');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch subjects');
      }
      const data = await response.json();
      setSubjects(Array.isArray(data) ? data : []);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Fetch subjects error:', errorMsg);
      setError(errorMsg);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const addSubject = useCallback(
    async (
      name: string,
      type: 'HAUPTFACH' | 'NEBENFACH',
      color: string,
      defaultRoom?: string,
      defaultTeacher?: string,
      saDouble: boolean = true
    ) => {
      setError(null);
      try {
        const response = await fetch('/api/subjects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            type,
            color,
            default_room: defaultRoom,
            default_teacher: defaultTeacher,
            sa_double: saDouble,
          }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to add subject');
        }
        const data = await response.json();
        setSubjects((prev) => [...prev, data]);
        return data;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error('Add subject error:', errorMsg);
        setError(errorMsg);
        throw err;
      }
    },
    []
  );

  const updateSubject = useCallback(
    async (id: string, updates: Partial<Subject>) => {
      setError(null);
      try {
        const response = await fetch(`/api/subjects/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update subject');
        }
        const data = await response.json();
        setSubjects((prev) => prev.map((s) => (s.id === id ? data : s)));
        return data;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error('Update subject error:', errorMsg);
        setError(errorMsg);
        throw err;
      }
    },
    []
  );

  const deleteSubject = useCallback(async (id: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/subjects/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete subject');
      }
      setSubjects((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Delete subject error:', errorMsg);
      setError(errorMsg);
      throw err;
    }
  }, []);

  const cleanupInvalidSubjects = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch('/api/subjects/cleanup', {
        method: 'POST',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Cleanup failed');
      }
      const data = await response.json();
      // Fetch subjects again to refresh
      await fetchSubjects();
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Cleanup error:', errorMsg);
      setError(errorMsg);
      throw err;
    }
  }, [fetchSubjects]);

  return {
    subjects,
    loading,
    error,
    fetchSubjects,
    addSubject,
    updateSubject,
    deleteSubject,
    cleanupInvalidSubjects,
    setError,
    setSubjects,
  };
};

export const useGrades = () => {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGrades = useCallback(async (subjectId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL('/api/grades', window.location.origin);
      if (subjectId) url.searchParams.append('subjectId', subjectId);
      const response = await fetch(url.toString());
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch grades');
      }
      const data = await response.json();
      setGrades(Array.isArray(data) ? data : []);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Fetch grades error:', errorMsg);
      setError(errorMsg);
      setGrades([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const addGrade = useCallback(
    async (
      subjectId: string,
      grade: number,
      gradeType: 'SCHULAUFGABE' | 'MÜNDLICH' | 'KURZARBEIT' | 'KSL',
      weight?: number,
      description?: string,
      gradeDate?: string
    ) => {
      setError(null);
      try {
        const response = await fetch('/api/grades', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subjectId,
            grade,
            gradeType,
            weight: weight || 1.0,
            description,
            gradeDate,
          }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to add grade');
        }
        const data = await response.json();
        setGrades((prev) => [...prev, data]);
        return data;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error('Add grade error:', errorMsg);
        setError(errorMsg);
        throw err;
      }
    },
    []
  );

  const updateGrade = useCallback(
    async (
      id: string,
      updates: {
        grade?: number;
        gradeType?: Grade['grade_type'];
        weight?: number;
        description?: string;
        gradeDate?: string;
      }
    ) => {
      setError(null);
      try {
        const response = await fetch(`/api/grades/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update grade');
        }
        const data = await response.json();
        setGrades((prev) => prev.map((g) => (g.id === id ? data : g)));
        return data;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error('Update grade error:', errorMsg);
        setError(errorMsg);
        throw err;
      }
    },
    []
  );

  const deleteGrade = useCallback(async (id: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/grades/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete grade');
      }
      setGrades((prev) => prev.filter((g) => g.id !== id));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Delete grade error:', errorMsg);
      setError(errorMsg);
      throw err;
    }
  }, []);

  return {
    grades,
    loading,
    error,
    fetchGrades,
    addGrade,
    updateGrade,
    deleteGrade,
    setError,
    setGrades,
  };
};
