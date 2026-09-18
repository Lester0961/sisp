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
/* Bulk import: VERIFIED curricula -> programs/courses/curricula.
 * Prod-safe: idempotent upserts, per-program transactions, dry-run mode.
 * Usage:
 *   npx ts-node prisma/seed-curricula.ts --dry-run
 *   npx ts-node prisma/seed-curricula.ts --apply
 * Never runs destructive deletes. Preserves §10 source anomalies.
 */
var client_1 = require("@prisma/client");
var node_fs_1 = require("node:fs");
var node_path_1 = require("node:path");
var DRY = process.argv.includes('--dry-run') || !process.argv.includes('--apply');
var prisma = new client_1.PrismaClient();
var PROGRAM_NAMES = {
    'BSMA': 'Bachelor of Science in Multimedia Arts',
    'BSCS': 'Bachelor of Science in Computer Science',
    'BSCrim': 'Bachelor of Science in Criminology',
    'BSEd-Fil-2026': 'Bachelor of Secondary Education Major in Filipino (2026)',
    'BSOA': 'Bachelor of Science in Office Administration',
    'BSEd-Fil-2024': 'Bachelor in Secondary Major in Filipino (2024)',
    'BSEd-Math': 'Bachelor in Secondary Major in Mathematics',
    'BSEd-Eng': 'Bachelor in Secondary Major in English',
    'BEED': 'Bachelor of Elementary Education',
};
function synthCode(programCode, title) {
    var slug = title.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
    return "".concat(programCode, "-").concat(slug || 'ELECTIVE');
}
function splitPrereqs(raw) {
    if (!raw)
        return [];
    return raw.split(/[,;]/).map(function (s) { return s.trim().replace(/\s+/g, ' '); }).filter(Boolean);
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var payload, programs, totalCourses, totalLinks, totalUnresolved, totalSelfRef, _loop_1, _i, programs_1, p;
        var _this = this;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    payload = JSON.parse((0, node_fs_1.readFileSync)((0, node_path_1.join)(__dirname, 'curricula-verified.json'), 'utf8'));
                    programs = payload.programs;
                    console.log("Source: ".concat(payload.sourceDoc, " sha=").concat(payload.sourceSha256.slice(0, 12), " programs=").concat(programs.length, " rows=").concat(payload.totalRows, " mode=").concat(DRY ? 'DRY-RUN' : 'APPLY'));
                    totalCourses = 0, totalLinks = 0, totalUnresolved = 0, totalSelfRef = 0;
                    _loop_1 = function (p) {
                        var name_1, _c, _d, r, _e, _f, req, selfCodes;
                        return __generator(this, function (_g) {
                            switch (_g.label) {
                                case 0:
                                    name_1 = (_a = PROGRAM_NAMES[p.code]) !== null && _a !== void 0 ? _a : p.heading;
                                    if (DRY) {
                                        console.log("[dry] Program ".concat(p.code, " | ").concat(name_1, " | eff=").concat(p.effectiveYear, " courses=").concat(p.courses.length));
                                        totalCourses += p.courses.length;
                                        for (_c = 0, _d = p.courses; _c < _d.length; _c++) {
                                            r = _d[_c];
                                            for (_e = 0, _f = splitPrereqs(r.prereq); _e < _f.length; _e++) {
                                                req = _f[_e];
                                                totalLinks++;
                                                selfCodes = splitPrereqs(r.prereq);
                                                if (r.code && selfCodes.includes(r.code))
                                                    totalSelfRef++;
                                            }
                                        }
                                        return [2 /*return*/, "continue"];
                                    }
                                    return [4 /*yield*/, prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                            var program, curriculum, codeToId, _i, _a, r, code, course, arr, _loop_2, _b, _c, r;
                                            var _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v;
                                            return __generator(this, function (_w) {
                                                switch (_w.label) {
                                                    case 0: return [4 /*yield*/, tx.program.upsert({
                                                            where: { code: p.code },
                                                            update: { name: name_1 },
                                                            create: { code: p.code, name: name_1 },
                                                        })];
                                                    case 1:
                                                        program = _w.sent();
                                                        return [4 /*yield*/, tx.curriculum.upsert({
                                                                where: { programId_effectiveYear: { programId: program.id, effectiveYear: p.effectiveYear } },
                                                                update: { schoolYear: p.schoolYear, cmo: p.cmo, sourceFile: p.sourceFile },
                                                                create: { programId: program.id, effectiveYear: p.effectiveYear, schoolYear: p.schoolYear, cmo: p.cmo, sourceFile: p.sourceFile },
                                                            })];
                                                    case 2:
                                                        curriculum = _w.sent();
                                                        codeToId = new Map();
                                                        _i = 0, _a = p.courses;
                                                        _w.label = 3;
                                                    case 3:
                                                        if (!(_i < _a.length)) return [3 /*break*/, 7];
                                                        r = _a[_i];
                                                        if (!r.title)
                                                            return [3 /*break*/, 6];
                                                        code = (_d = r.code) !== null && _d !== void 0 ? _d : synthCode(p.code, r.title);
                                                        return [4 /*yield*/, tx.course.upsert({
                                                                where: { code_title: { code: code, title: r.title } },
                                                                update: { units: (_e = r.units) !== null && _e !== void 0 ? _e : 0, lecUnits: (_f = r.lec) !== null && _f !== void 0 ? _f : 0, labUnits: (_g = r.lab) !== null && _g !== void 0 ? _g : 0, subjectArea: r.subjectArea, catNo: r.catNo, prereqText: r.prereq },
                                                                create: { code: code, title: r.title, units: (_h = r.units) !== null && _h !== void 0 ? _h : 0, lecUnits: (_j = r.lec) !== null && _j !== void 0 ? _j : 0, labUnits: (_k = r.lab) !== null && _k !== void 0 ? _k : 0, subjectArea: r.subjectArea, catNo: r.catNo, prereqText: r.prereq },
                                                            })];
                                                    case 4:
                                                        course = _w.sent();
                                                        arr = (_l = codeToId.get(code)) !== null && _l !== void 0 ? _l : [];
                                                        arr.push(course.id);
                                                        codeToId.set(code, arr);
                                                        totalCourses++;
                                                        return [4 /*yield*/, tx.curriculumCourse.upsert({
                                                                where: { curriculumId_courseId: { curriculumId: curriculum.id, courseId: course.id } },
                                                                update: { yearLevel: (_m = r.yearLevel) !== null && _m !== void 0 ? _m : 1, semester: (_o = r.termNumber) !== null && _o !== void 0 ? _o : 1, termNumber: r.termNumber, termLabel: r.termLabel, sourceTotal: r.sourceTotal },
                                                                create: { curriculumId: curriculum.id, courseId: course.id, yearLevel: (_p = r.yearLevel) !== null && _p !== void 0 ? _p : 1, semester: (_q = r.termNumber) !== null && _q !== void 0 ? _q : 1, termNumber: r.termNumber, termLabel: r.termLabel, sourceTotal: r.sourceTotal },
                                                            })];
                                                    case 5:
                                                        _w.sent();
                                                        _w.label = 6;
                                                    case 6:
                                                        _i++;
                                                        return [3 /*break*/, 3];
                                                    case 7:
                                                        _loop_2 = function (r) {
                                                            var code, ids, courseId, _x, _y, req, targets, isSelf, requiresId, isUnresolved;
                                                            return __generator(this, function (_z) {
                                                                switch (_z.label) {
                                                                    case 0:
                                                                        if (!r.title)
                                                                            return [2 /*return*/, "continue"];
                                                                        code = (_r = r.code) !== null && _r !== void 0 ? _r : synthCode(p.code, r.title);
                                                                        ids = codeToId.get(code);
                                                                        if (!(ids === null || ids === void 0 ? void 0 : ids.length))
                                                                            return [2 /*return*/, "continue"];
                                                                        courseId = ids[0];
                                                                        _x = 0, _y = splitPrereqs(r.prereq);
                                                                        _z.label = 1;
                                                                    case 1:
                                                                        if (!(_x < _y.length)) return [3 /*break*/, 4];
                                                                        req = _y[_x];
                                                                        totalLinks++;
                                                                        targets = (_t = (_s = codeToId.get(req)) !== null && _s !== void 0 ? _s : codeToId.get(req.replace(/\s+/g, ''))) !== null && _t !== void 0 ? _t : [];
                                                                        isSelf = req === code;
                                                                        if (isSelf)
                                                                            totalSelfRef++;
                                                                        requiresId = (_u = targets.find(function (id) { return id !== courseId; })) !== null && _u !== void 0 ? _u : (isSelf ? courseId : (_v = targets[0]) !== null && _v !== void 0 ? _v : null);
                                                                        isUnresolved = !requiresId;
                                                                        if (isUnresolved)
                                                                            totalUnresolved++;
                                                                        return [4 /*yield*/, tx.coursePrerequisite.upsert({
                                                                                where: { courseId_requiresCode: { courseId: courseId, requiresCode: req } },
                                                                                update: { requiresId: requiresId, isSelfReference: isSelf, isUnresolved: isUnresolved, note: isSelf ? 'source self-reference preserved (§10)' : isUnresolved ? 'code not in same curriculum; preserved verbatim' : null },
                                                                                create: { courseId: courseId, requiresCode: req, requiresId: requiresId, isSelfReference: isSelf, isUnresolved: isUnresolved, note: isSelf ? 'source self-reference preserved (§10)' : isUnresolved ? 'code not in same curriculum; preserved verbatim' : null },
                                                                            })];
                                                                    case 2:
                                                                        _z.sent();
                                                                        _z.label = 3;
                                                                    case 3:
                                                                        _x++;
                                                                        return [3 /*break*/, 1];
                                                                    case 4: return [2 /*return*/];
                                                                }
                                                            });
                                                        };
                                                        _b = 0, _c = p.courses;
                                                        _w.label = 8;
                                                    case 8:
                                                        if (!(_b < _c.length)) return [3 /*break*/, 11];
                                                        r = _c[_b];
                                                        return [5 /*yield**/, _loop_2(r)];
                                                    case 9:
                                                        _w.sent();
                                                        _w.label = 10;
                                                    case 10:
                                                        _b++;
                                                        return [3 /*break*/, 8];
                                                    case 11: return [2 /*return*/];
                                                }
                                            });
                                        }); })];
                                case 1:
                                    _g.sent();
                                    console.log("[ok] ".concat(p.code, ": ").concat(p.courses.length, " rows committed"));
                                    return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, programs_1 = programs;
                    _b.label = 1;
                case 1:
                    if (!(_i < programs_1.length)) return [3 /*break*/, 4];
                    p = programs_1[_i];
                    return [5 /*yield**/, _loop_1(p)];
                case 2:
                    _b.sent();
                    _b.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    console.log("Done. courses upserted=".concat(totalCourses, " prereqLinks=").concat(totalLinks, " selfRef=").concat(totalSelfRef, " unresolved=").concat(totalUnresolved));
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .then(function () { return prisma.$disconnect(); })
    .catch(function (e) { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
    switch (_a.label) {
        case 0:
            console.error(e);
            return [4 /*yield*/, prisma.$disconnect()];
        case 1:
            _a.sent();
            process.exit(1);
            return [2 /*return*/];
    }
}); }); });
