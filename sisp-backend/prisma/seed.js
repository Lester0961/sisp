"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var bcrypt = require("bcryptjs");
var document_catalog_1 = require("../src/common/constants/document-catalog");
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var localDemoPassword, mockPasswordHash, rolesData, _i, rolesData_1, role, usersData, _a, usersData_1, user, programCatalog, _b, programCatalog_1, program, _c, _d, term, bscsProgram, studentProfile, err_1, _e, DOCUMENT_CATALOG_1, item;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    console.log('Starting Supabase database seeding...');
                    localDemoPassword = process.env.LOCAL_DEMO_PASSWORD || 'local-demo-only';
                    return [4 /*yield*/, bcrypt.hash(localDemoPassword, 10)];
                case 1:
                    mockPasswordHash = _f.sent();
                    rolesData = [
                        { id: 'role-id-admin_staff', name: 'admin_staff' },
                        { id: 'role-id-dean', name: 'dean' },
                        { id: 'role-id-faculty', name: 'faculty' },
                        { id: 'role-id-student', name: 'student' },
                        { id: 'role-id-sys_admin', name: 'sys_admin' },
                        { id: 'role-id-live_agent', name: 'live_agent' },
                    ];
                    _i = 0, rolesData_1 = rolesData;
                    _f.label = 2;
                case 2:
                    if (!(_i < rolesData_1.length)) return [3 /*break*/, 5];
                    role = rolesData_1[_i];
                    return [4 /*yield*/, prisma.role.upsert({
                            where: { id: role.id },
                            update: { name: role.name },
                            create: { id: role.id, name: role.name },
                        })];
                case 3:
                    _f.sent();
                    _f.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5:
                    console.log('Roles seeded successfully.');
                    usersData = [
                        {
                            id: 'mock-admin-id',
                            email: 'admin@rmc.edu.ph',
                            passwordHash: mockPasswordHash,
                            firstName: 'Regis',
                            lastName: 'Admin',
                            roleId: 'role-id-admin_staff',
                        },
                        {
                            id: 'mock-dean-id',
                            email: 'dean@rmc.edu.ph',
                            passwordHash: mockPasswordHash,
                            firstName: 'Regis',
                            lastName: 'Dean',
                            roleId: 'role-id-dean',
                        },
                        {
                            id: 'mock-sysadmin-id',
                            email: 'sysadmin@rmc.edu.ph',
                            passwordHash: mockPasswordHash,
                            firstName: 'System',
                            lastName: 'Administrator',
                            roleId: 'role-id-sys_admin',
                        },
                        {
                            id: 'mock-live-agent-id',
                            email: 'agent@rmc.edu.ph',
                            passwordHash: mockPasswordHash,
                            firstName: 'Support',
                            lastName: 'Agent',
                            roleId: 'role-id-live_agent',
                        },
                        {
                            id: 'mock-student-id',
                            email: 'student@rmc.edu.ph',
                            passwordHash: mockPasswordHash,
                            firstName: 'John',
                            lastName: 'Doe',
                            roleId: 'role-id-student',
                        },
                        {
                            id: 'mock-faculty-id',
                            email: 'faculty@rmc.edu.ph',
                            passwordHash: mockPasswordHash,
                            firstName: 'Regis',
                            lastName: 'Faculty',
                            roleId: 'role-id-faculty',
                        },
                    ];
                    _a = 0, usersData_1 = usersData;
                    _f.label = 6;
                case 6:
                    if (!(_a < usersData_1.length)) return [3 /*break*/, 9];
                    user = usersData_1[_a];
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: user.email },
                            update: {
                                passwordHash: user.passwordHash,
                                firstName: user.firstName,
                                lastName: user.lastName,
                                roleId: user.roleId,
                            },
                            create: {
                                id: user.id,
                                email: user.email,
                                passwordHash: user.passwordHash,
                                firstName: user.firstName,
                                lastName: user.lastName,
                                roleId: user.roleId,
                                mustChangePassword: false,
                            },
                        })];
                case 7:
                    _f.sent();
                    _f.label = 8;
                case 8:
                    _a++;
                    return [3 /*break*/, 6];
                case 9:
                    console.log('User accounts seeded successfully.');
                    programCatalog = [
                        { code: 'BSCS', name: 'Bachelor of Science in Computer Science' },
                        { code: 'BSOA', name: 'Bachelor of Science in Office Administration' },
                        { code: 'BSMA', name: 'Bachelor of Science in Multimedia Arts' },
                        { code: 'BSCrim', name: 'Bachelor of Science in Criminology' },
                        { code: 'BEED', name: 'Bachelor of Elementary Education' },
                        { code: 'BSEd-Math', name: 'Bachelor in Secondary Major in Mathematics' },
                        { code: 'BSEd-Eng', name: 'Bachelor in Secondary Major in English' },
                        // Disambiguated Filipino tracks (VERIFIED doc §§4,6). Legacy aliases kept below.
                        { code: 'BSEd-Fil-2026', name: 'Bachelor of Secondary Education Major in Filipino (2026)' },
                        { code: 'BSEd-Fil-2024', name: 'Bachelor in Secondary Major in Filipino (2024)' },
                        // Legacy aliases (pre-verified catalog) — retained, do not assign new students.
                        { code: 'BSEd-English', name: 'Bachelor of Secondary Education – English (legacy)' },
                        { code: 'BSEd-Secondary', name: 'Bachelor of Secondary Education (legacy)' },
                    ];
                    _b = 0, programCatalog_1 = programCatalog;
                    _f.label = 10;
                case 10:
                    if (!(_b < programCatalog_1.length)) return [3 /*break*/, 13];
                    program = programCatalog_1[_b];
                    return [4 /*yield*/, prisma.program.upsert({
                            where: { code: program.code },
                            update: { name: program.name },
                            create: { code: program.code, name: program.name },
                        })];
                case 11:
                    _f.sent();
                    _f.label = 12;
                case 12:
                    _b++;
                    return [3 /*break*/, 10];
                case 13:
                    _c = 0, _d = [1, 2, 3];
                    _f.label = 14;
                case 14:
                    if (!(_c < _d.length)) return [3 /*break*/, 17];
                    term = _d[_c];
                    return [4 /*yield*/, prisma.academicTerm.upsert({
                            where: { code: "2026-2027-T".concat(term) },
                            update: { label: "Term ".concat(term), termNumber: term },
                            create: {
                                academicYear: '2026-2027',
                                termNumber: term,
                                code: "2026-2027-T".concat(term),
                                label: "Term ".concat(term),
                                status: term === 1 ? 'active' : 'planned',
                                isCurrent: term === 1,
                            },
                        })];
                case 15:
                    _f.sent();
                    _f.label = 16;
                case 16:
                    _c++;
                    return [3 /*break*/, 14];
                case 17:
                    console.log('Program catalog and academic terms seeded successfully.');
                    _f.label = 18;
                case 18:
                    _f.trys.push([18, 23, , 24]);
                    return [4 /*yield*/, prisma.program.findUnique({ where: { code: 'BSCS' } })];
                case 19:
                    bscsProgram = _f.sent();
                    if (!bscsProgram) return [3 /*break*/, 22];
                    return [4 /*yield*/, prisma.studentProfile.upsert({
                            where: { userId: 'mock-student-id' },
                            update: { programId: bscsProgram.id },
                            create: {
                                id: 'mock-student-profile-id',
                                userId: 'mock-student-id',
                                studentNumber: 'RMC-2026-0001',
                                programId: bscsProgram.id,
                                yearLevel: 3,
                            },
                        })];
                case 20:
                    studentProfile = _f.sent();
                    return [4 /*yield*/, prisma.accountBalance.upsert({
                            where: { studentId: studentProfile.id },
                            update: { balance: 12500.5 },
                            create: {
                                id: 'mock-balance-id',
                                studentId: studentProfile.id,
                                balance: 12500.5,
                                status: 'active',
                            },
                        })];
                case 21:
                    _f.sent();
                    console.log('Demo student profile and treasury balance seeded successfully.');
                    _f.label = 22;
                case 22: return [3 /*break*/, 24];
                case 23:
                    err_1 = _f.sent();
                    console.error('Warning: Failed to seed demo student profile (user ID mismatch?)', err_1);
                    return [3 /*break*/, 24];
                case 24:
                    _e = 0, DOCUMENT_CATALOG_1 = document_catalog_1.DOCUMENT_CATALOG;
                    _f.label = 25;
                case 25:
                    if (!(_e < DOCUMENT_CATALOG_1.length)) return [3 /*break*/, 28];
                    item = DOCUMENT_CATALOG_1[_e];
                    return [4 /*yield*/, prisma.documentCatalogItem.upsert({
                            where: { code: item.code },
                            update: {
                                label: item.label,
                                fee: item.fee,
                                sortOrder: item.sortOrder,
                                isActive: true,
                            },
                            create: {
                                id: item.id,
                                code: item.code,
                                label: item.label,
                                fee: item.fee,
                                sortOrder: item.sortOrder,
                                isActive: true,
                            },
                        })];
                case 26:
                    _f.sent();
                    _f.label = 27;
                case 27:
                    _e++;
                    return [3 /*break*/, 25];
                case 28:
                    console.log('Document catalog seeded successfully.');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .then(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                console.log('Seeding completed successfully!');
                return [2 /*return*/];
        }
    });
}); })
    .catch(function (e) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.error('Error during seeding:', e);
                return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                process.exit(1);
                return [2 /*return*/];
        }
    });
}); });
