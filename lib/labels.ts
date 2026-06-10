import type {
  AuthUser,
  DocumentType,
  ExpenseCategory,
  FeeCategory,
  ModuleSection,
  PaymentMethod,
  PaymentSource,
  PermissionLevel,
  StudentStatus,
  TeacherDocType,
  TeacherRole,
} from "./types";

export const TEACHER_ROLE_LABELS: Record<TeacherRole, string> = {
  PRACTICA_HOSPITALARIA: "Práctica Hospitalaria",
  PRACTICA_COMUNITARIA: "Práctica Comunitaria",
  TEORIA: "Teoría",
};

export const TEACHER_DOC_LABELS: Record<TeacherDocType, string> = {
  CV: "Currículum (CV)",
  DPI: "DPI",
  TITULO: "Título",
  COLEGIADO: "Colegiado",
  OTRO: "Otro",
};

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  SALARIOS: "Salarios y honorarios",
  INSUMOS: "Insumos y materiales",
  SERVICIOS: "Servicios (agua, luz, internet)",
  MANTENIMIENTO: "Mantenimiento",
  ADMINISTRATIVOS: "Administrativos y papelería",
  IMPREVISTOS: "Imprevistos",
};

export const FEE_CATEGORY_LABELS: Record<FeeCategory, string> = {
  INSCRIPCION: "Inscripción",
  MENSUALIDAD: "Mensualidad",
  MATERIALES: "Materiales / Insumos",
  REPOSICION_DIPLOMA: "Reposición de diploma",
  OTROS: "Otros",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  EFECTIVO: "Efectivo",
  TRANSFERENCIA: "Transferencia",
  DEPOSITO: "Depósito",
  TARJETA: "Tarjeta",
};

export const PAYMENT_SOURCE_LABELS: Record<PaymentSource, string> = {
  MANUAL: "Manual",
  WOOCOMMERCE: "Tienda en línea",
};

// Formatea un monto en Quetzales
export function formatGTQ(amount: number): string {
  return new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
  }).format(amount);
}

export const SECTION_LABELS: Record<ModuleSection, string> = {
  STUDENTS: "Expedientes",
  PAYMENTS: "Control de Pagos",
  REMINDERS: "Recordatorios",
  DASHBOARD: "Dashboard Financiero",
  DIPLOMAS: "Banca de Diplomas",
  ACTAS: "Gestión de Actas",
};

export const STATUS_LABELS: Record<StudentStatus, string> = {
  ACTIVO: "Activo",
  EGRESADO: "Egresado",
  BAJA: "Baja definitiva",
};

export const STATUS_STYLES: Record<StudentStatus, string> = {
  ACTIVO: "bg-green-100 text-green-800",
  EGRESADO: "bg-blue-100 text-blue-800",
  BAJA: "bg-gray-200 text-gray-700",
};

export const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  DPI: "DPI / Identificación",
  PARTIDA_NACIMIENTO: "Partida de nacimiento",
  FOTOGRAFIA: "Fotografía reciente",
  CODIGO_BASICO: "Código personal de básico",
  CERTIFICADO_BASICO: "Certificado de básico",
  DIPLOMA_PREVIO: "Título / diploma previo",
  CARTA_RECOMENDACION: "Carta de recomendación",
  OTRO: "Otro documento",
};

// Verifica si un usuario tiene acceso a una seccion con cierto nivel
export function canAccess(
  user: AuthUser | null,
  section: ModuleSection,
  level: PermissionLevel = "READER"
): boolean {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  const perm = user.permissions.find((p) => p.section === section);
  if (!perm) return false;
  if (level === "EDITOR") return perm.level === "EDITOR";
  return true;
}
