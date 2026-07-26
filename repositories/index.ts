// Wordlish · Barrel de repositorios
export { usersRepo } from './users';
// Módulo #7 (Bookings) migrado: el facade sincrónico vive en el service.
export { bookingsRepo } from '@/services/bookingsService';
// Módulos #8 (Packages) y #9 (ClassRecords) migrados: mismo patrón.
export { packagesRepo } from '@/services/packagesService';
export { classRecordsRepo } from '@/services/classRecordsService';
export { classEventsRepo } from './classEvents';
export { reportsRepo } from './reports';
export { materialsRepo } from './materials';
export { screenshotsRepo } from './screenshots';
export { notificationsRepo } from './notifications';
export { paymentsRepo } from './payments';
export { availabilityRepo } from './availability';
export { payrollsRepo } from './payrolls';
