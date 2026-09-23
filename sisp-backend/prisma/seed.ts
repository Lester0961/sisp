/**
 * Safe reference-data seed. It never creates users, student profiles, balances,
 * transactions, requests, or other person-linked/demo records.
 */
import { PrismaClient } from '@prisma/client';
import { DOCUMENT_CATALOG } from '../src/common/constants/document-catalog';
import { APPLICATION_ROLE_NAMES, PERMISSION_DEFINITIONS, ROLE_PERMISSIONS } from '../src/common/authz/rbac';

const prisma = new PrismaClient();

async function main() {
  const roleNames = APPLICATION_ROLE_NAMES;
  const roleIds = new Map<string, string>();

  for (const name of roleNames) {
    const role = await prisma.role.upsert({
      where: { name },
      update: {},
      create: { id: `role-id-${name}`, name },
    });
    roleIds.set(name, role.id);
  }

  const permissionIds = new Map<string, string>();
  for (const permission of PERMISSION_DEFINITIONS) {
    const saved = await prisma.permission.upsert({
      where: { action_resource: { action: permission.action, resource: permission.resource } },
      update: {},
      create: permission,
    });
    permissionIds.set(`${permission.resource}.${permission.action}`, saved.id);
  }

  for (const [roleName, keys] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = roleIds.get(roleName);
    if (!roleId) continue;
    for (const key of keys) {
      const permissionId = permissionIds.get(key);
      if (!permissionId) throw new Error(`RBAC mapping references unknown permission: ${key}`);
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        update: {},
        create: { roleId, permissionId },
      });
    }
  }

  const activeCodes = DOCUMENT_CATALOG.map(({ code }) => code);
  await prisma.documentCatalogItem.updateMany({
    where: { code: { notIn: activeCodes } },
    data: { isActive: false },
  });
  for (const item of DOCUMENT_CATALOG) {
    const { id, code, label, fee, sortOrder, billingBasis, ...optional } = item;
    await prisma.documentCatalogItem.upsert({
      where: { code },
      update: { label, fee, sortOrder, billingBasis, feeNote: 'feeNote' in optional ? optional.feeNote : null, isActive: true },
      create: { id, code, label, fee, sortOrder, billingBasis, feeNote: 'feeNote' in optional ? optional.feeNote : null, isActive: true },
    });
  }

  // Snapshot of the three non-person academic terms in the supplied backup.
  // Importing these terms does not import student-semester or enrollment data.
  const academicTerms = [
    { id: '55e10e33-e582-455b-8902-87112457187e', academicYear: '2026-2027', termNumber: 1, code: '2026-2027-T1', label: 'Term 1', status: 'active', isCurrent: true },
    { id: 'cc97e48a-e4ca-46c5-b4de-52e51a5e0634', academicYear: '2026-2027', termNumber: 2, code: '2026-2027-T2', label: 'Term 2', status: 'planned', isCurrent: false },
    { id: 'e17f21c5-29df-4e12-8338-d8694582ea57', academicYear: '2026-2027', termNumber: 3, code: '2026-2027-T3', label: 'Term 3', status: 'planned', isCurrent: false },
  ];
  for (const term of academicTerms) {
    const { id, code, ...data } = term;
    await prisma.academicTerm.upsert({
      where: { code },
      update: data,
      create: { id, code, ...data },
    });
  }

  // Institutional admission requirements referenced by the admission flow.
  const requirementDefinitions = [
    { id: '20000000-0000-4000-8000-000000000001', code: 'FORM_137', title: 'High School Report Card (Form 138 / SF9)', applicantType: 'freshman', isRequired: true, sortOrder: 10 },
    { id: '20000000-0000-4000-8000-000000000002', code: 'GOOD_MORAL', title: 'Certificate of Good Moral Character', applicantType: null, isRequired: true, sortOrder: 20 },
    { id: '20000000-0000-4000-8000-000000000003', code: 'PSA_BIRTH', title: 'PSA Birth Certificate', applicantType: null, isRequired: true, sortOrder: 30 },
    { id: '20000000-0000-4000-8000-000000000004', code: 'ID_PHOTO', title: '2x2 Recent Colored Photo', applicantType: null, isRequired: true, sortOrder: 40 },
    { id: '20000000-0000-4000-8000-000000000005', code: 'HONORABLE_DISMISSAL', title: 'Honorable Dismissal / Transfer Credential', applicantType: 'transferee', isRequired: true, sortOrder: 50 },
  ];
  for (const definition of requirementDefinitions) {
    const { id, code, ...data } = definition;
    await prisma.admissionRequirementDefinition.upsert({
      where: { code },
      update: data,
      create: { id, code, ...data },
    });
  }

  console.log('Reference seed complete: roles, permissions, six approved document types, admission requirements, and three archived academic terms. No accounts or demo records created.');
}

main()
  .catch((error) => {
    console.error('Reference seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
