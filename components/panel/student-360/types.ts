/** Student 360 görünümü ve alt panellerinin ortak prop sözleşmeleri. */
import type { ReactNode } from "react";
import type { Student360Bundle } from "@/lib/panel/student-360/index";

export type Student360ViewProps = { bundle: Student360Bundle; listHref: string; adminActions?: ReactNode; /** Öğretmen contextual Dino; admin 360'da açılmaz. */ dinoEnabled?: boolean };
export type OverviewPanelProps = { data: NonNullable<Student360Bundle["overview"]> };
export type CalendarPanelProps = { data: NonNullable<Student360Bundle["lessons"]> };
export type AcademicPanelProps = { data: NonNullable<Student360Bundle["academic"]> };
export type LessonsPanelProps = { data: NonNullable<Student360Bundle["lessons"]> };
export type CoachingPanelProps = { data: NonNullable<Student360Bundle["coaching"]> };
export type ExamsPanelProps = { data: NonNullable<Student360Bundle["exams"]> };
export type RiskPanelProps = { data: NonNullable<Student360Bundle["riskTab"]> };
export type AssignmentsPanelProps = { data: NonNullable<Student360Bundle["assignmentsTab"]> };
export type TeachersPanelProps = { data: NonNullable<Student360Bundle["teachersTab"]>; studentId: string; teacherOptions: Student360Bundle["teacherOptions"]; canManage: boolean };
export type ParentPanelProps = { data: NonNullable<Student360Bundle["parent"]>; studentId: string; canManage: boolean; parentOptions: Student360Bundle["parentOptions"] };
export type CommercePanelProps = { data: NonNullable<Student360Bundle["commerce"]>; adminActions?: ReactNode };
