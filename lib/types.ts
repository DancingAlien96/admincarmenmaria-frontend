// Tipos compartidos del dominio (espejo del backend)

export type ModuleSection =
  | "STUDENTS"
  | "PAYMENTS"
  | "REMINDERS"
  | "DASHBOARD"
  | "DIPLOMAS"
  | "ACTAS";

export type PermissionLevel = "READER" | "EDITOR";
export type UserRole = "ADMIN" | "STAFF";

export interface Permission {
  section: ModuleSection;
  level: PermissionLevel;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  permissions: Permission[];
}

export type StudentStatus = "ACTIVO" | "EGRESADO" | "BAJA";

export type DocumentType =
  | "DPI"
  | "PARTIDA_NACIMIENTO"
  | "FOTOGRAFIA"
  | "CODIGO_BASICO"
  | "CERTIFICADO_BASICO"
  | "DIPLOMA_PREVIO"
  | "CARTA_RECOMENDACION"
  | "OTRO";

export interface Guardian {
  id?: string;
  name: string;
  relationship?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface StudentListItem {
  id: string;
  fullName: string;
  dpi: string | null;
  status: StudentStatus;
  phonePrimary: string | null;
  enrollmentDate: string;
  _count: { documents: number };
}

export interface StudentDocument {
  id: string;
  type: DocumentType;
  fileName: string;
  fileUrl: string;
  fileKey: string | null;
  createdAt: string;
}

export interface StatusHistoryEntry {
  id: string;
  fromStatus: StudentStatus | null;
  toStatus: StudentStatus;
  reason: string | null;
  createdAt: string;
  changedBy: { name: string } | null;
}

export interface StudentDetail {
  id: string;
  fullName: string;
  dpi: string | null;
  birthDate: string | null;
  department: string | null;
  municipality: string | null;
  address: string | null;
  phonePrimary: string | null;
  phoneAlt: string | null;
  email: string | null;
  status: StudentStatus;
  enrollmentDate: string;
  archived: boolean;
  guardians: Guardian[];
  documents: StudentDocument[];
  statusHistory: StatusHistoryEntry[];
  createdBy: { name: string } | null;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  permissions: Permission[];
}

// --- Módulo 5: Banca de Diplomas ---

export interface RecommendationLetter {
  id: string;
  issueDate: string;
  notes: string | null;
  createdAt: string;
}

export interface GraduateListItem {
  id: string;
  fullName: string;
  dpi: string;
  email: string | null;
  phone: string | null;
  mspasCode: string | null;
  diplomaNumber: string;
  graduationDate: string;
  diplomaUrl: string | null;
}

export interface GraduateDetail extends GraduateListItem {
  diplomaKey: string | null;
  studentId: string | null;
  student: { id: string; fullName: string } | null;
  letters: RecommendationLetter[];
}

// --- Módulo 6: Actas de calificaciones ---

export interface ActaEntry {
  id?: string;
  studentId: string | null;
  studentName: string;
  score: number;
}

export interface ActaListItem {
  id: string;
  actaNumber: string;
  folios: string | null;
  phase: string;
  actaDate: string;
  _count: { entries: number };
}

export interface ActaDetail {
  id: string;
  actaNumber: string;
  folios: string | null;
  phase: string;
  actaDate: string;
  closeDate: string | null;
  directora: string | null;
  secretario: string | null;
  notes: string | null;
  sentAt: string | null;
  sentTo: string | null;
  entries: ActaEntry[];
  createdBy: { name: string } | null;
}

// --- Módulo 2: Pagos ---

export type FeeCategory =
  | "INSCRIPCION"
  | "MENSUALIDAD"
  | "MATERIALES"
  | "REPOSICION_DIPLOMA"
  | "OTROS";

export type PaymentMethod =
  | "EFECTIVO"
  | "TRANSFERENCIA"
  | "DEPOSITO"
  | "TARJETA";

export type PaymentSource = "MANUAL" | "WOOCOMMERCE";
export type PaymentStatus = "ACTIVO" | "ANULADO";

export interface FeeType {
  id: string;
  name: string;
  category: FeeCategory;
  amount: number;
  active: boolean;
}

export interface Payment {
  id: string;
  studentId: string | null;
  feeTypeId: string | null;
  concept: string;
  amount: number;
  discount: number;
  net: number;
  method: PaymentMethod;
  source: PaymentSource;
  status: PaymentStatus;
  paidAt: string;
  receiptUrl: string | null;
  receiptKey: string | null;
  wooOrderId: number | null;
  payerName: string | null;
  payerEmail: string | null;
  annulReason: string | null;
  annulledAt: string | null;
  student: { id: string; fullName: string; dpi: string } | null;
  feeType: { id: string; name: string; category: FeeCategory } | null;
  registeredBy: { name: string } | null;
  annulledBy: { name: string } | null;
}

export interface PaymentTotals {
  gross: number;
  discount: number;
  net: number;
}

// --- Módulo 4: Dashboard Financiero ---

export type ExpenseCategory =
  | "SALARIOS"
  | "INSUMOS"
  | "SERVICIOS"
  | "MANTENIMIENTO"
  | "ADMINISTRATIVOS"
  | "IMPREVISTOS";

export interface Expense {
  id: string;
  category: ExpenseCategory;
  concept: string;
  amount: number;
  spentAt: string;
  notes: string | null;
  receiptUrl: string | null;
  registeredBy: { name: string } | null;
}

export interface DashboardData {
  period: { from: string; to: string };
  kpis: {
    netIncome: number;
    grossIncome: number;
    discounts: number;
    totalExpenses: number;
    balance: number;
    paymentsCount: number;
    expensesCount: number;
  };
  incomeByMethod: { method: PaymentMethod; total: number }[];
  expensesByCategory: { category: ExpenseCategory; total: number }[];
  monthly: {
    label: string;
    income: number;
    expense: number;
    balance: number;
  }[];
}

// --- Módulo 3: WhatsApp / Recordatorios ---

export type WaDirection = "INBOUND" | "OUTBOUND";
export type WaStatus =
  | "RECEIVED"
  | "SENT"
  | "DELIVERED"
  | "READ"
  | "FAILED";

export interface WhatsappMessage {
  id: string;
  direction: WaDirection;
  phone: string;
  body: string;
  status: WaStatus;
  kind: string | null;
  wamid: string | null;
  error: string | null;
  createdAt: string;
  student: { id: string; fullName: string } | null;
}

export interface BotConfig {
  id: number;
  enabled: boolean;
  knowledgeBase: string;
  systemPrompt: string | null;
  updatedAt: string;
}

// --- Overview (pagina de inicio) ---

export interface OverviewData {
  year: number;
  students: {
    total: number;
    byStatus: { ACTIVO: number; EGRESADO: number; BAJA: number };
  };
  graduatesTotal: number;
  actasTotal: number;
  finance: {
    incomeYear: number;
    expenseYear: number;
    balanceYear: number;
    moraTotal: number;
  };
  paymentsBySource: { source: PaymentSource; total: number; count: number }[];
  monthlyIncome: { label: string; income: number }[];
  whatsappOutbound: number;
}

// --- Catedráticos ---

export type TeacherRole =
  | "PRACTICA_HOSPITALARIA"
  | "PRACTICA_COMUNITARIA"
  | "TEORIA";

export type TeacherDocType = "CV" | "DPI" | "TITULO" | "COLEGIADO" | "OTRO";

export interface TeacherDocument {
  id: string;
  type: TeacherDocType;
  fileName: string;
  fileUrl: string;
  fileKey: string | null;
  createdAt: string;
}

export interface TeacherListItem {
  id: string;
  fullName: string;
  dpi: string | null;
  phone: string | null;
  email: string | null;
  specialty: string | null;
  active: boolean;
  roles: TeacherRole[];
  _count: { documents: number };
}

export interface TeacherDetail {
  id: string;
  fullName: string;
  dpi: string | null;
  phone: string | null;
  email: string | null;
  title: string | null;
  collegiate: string | null;
  specialty: string | null;
  notes: string | null;
  active: boolean;
  roles: TeacherRole[];
  documents: TeacherDocument[];
}

// --- Acta de Inauguración ---

export interface InauguracionListItem {
  id: string;
  actaNumber: string;
  promocion: string;
  cohorte: number;
  actoDate: string;
  studentCount: number;
}
