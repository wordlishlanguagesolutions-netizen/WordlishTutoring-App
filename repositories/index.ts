// Wordlish · Barrel de repositorios
export { usersRepo } from './users';
// Módulo #7 (Bookings) migrado: el facade sincrónico vive en el service.
export { bookingsRepo } from '@/services/bookingsService';
// Módulos #8 (Packages) y #9 (ClassRecords) migrados: mismo patrón.
export { packagesRepo } from '@/services/packagesService';
export { classRecordsRepo } from '@/services/classRecordsService';
// Módulos #10 (Materials), #11 (Screenshots) y #12 (Reports) migrados.
export { materialsRepo } from '@/services/materialsService';
export { screenshotsRepo } from '@/services/screenshotsService';
export { reportsRepo } from '@/services/reportsService';
export { classEventsRepo } from './classEvents';
export { notificationsRepo } from './notifications';
export { paymentsRepo } from './payments';
export { availabilityRepo } from './availability';
export { payrollsRepo } from './payrolls';
