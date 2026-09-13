export type OutcomeSearchContext = {
  lessonId?: string;
  groupId?: string;
  subject?: string;
  level?: string | null;
  query?: string;
  limit?: number;
};

export const DEFAULT_OUTCOME_SEARCH_LIMIT = 15;

export type OutcomeSearchItem = {
  id: string;
  code: string;
  title: string;
  subject: string;
  unit: string;
  skills: string[];
  favorite: boolean;
  recent: boolean;
};
