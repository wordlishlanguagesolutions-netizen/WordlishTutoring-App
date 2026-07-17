export type UserRole = 'admin' | 'supervisor' | 'teacher' | 'student' | 'guardian';

export interface RoleInfo {
  key: UserRole;
  label: string;
  description: string;
  icon: string;
  route: string;
}

export const ROLES: RoleInfo[] = [
  {
    key: 'admin',
    label: 'Administrador',
    description: 'Control total de la operación',
    icon: 'shield-checkmark',
    route: '/(admin)',
  },
  {
    key: 'supervisor',
    label: 'Supervisor',
    description: 'Monitoreo de clases en vivo',
    icon: 'eye',
    route: '/(supervisor)',
  },
  {
    key: 'teacher',
    label: 'Profesor',
    description: 'Disponibilidad, clases y reportes',
    icon: 'school',
    route: '/(teacher)',
  },
  {
    key: 'student',
    label: 'Estudiante',
    description: 'Reservar y asistir a clases',
    icon: 'person',
    route: '/(student)',
  },
  {
    key: 'guardian',
    label: 'Acudiente',
    description: 'Gestionar clases de tus estudiantes',
    icon: 'people',
    route: '/(guardian)',
  },
];

export const getRoleInfo = (role: UserRole): RoleInfo => {
  return ROLES.find((r) => r.key === role) ?? ROLES[3];
};
