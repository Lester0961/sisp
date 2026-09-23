import { PERMISSIONS_KEY } from '../../common/authz/require-permissions.decorator';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { StudentSemesterController } from './student-semester.controller';
import { StudentTermController } from './student-term.controller';

describe('student-term API authorization metadata', () => {
  it('requires the financial permission for staff access to all student obligations', () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, StudentSemesterController.prototype.findAll)).toEqual([
      'financial.manage',
    ]);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, StudentTermController.prototype.findAll)).toEqual([
      'financial.manage',
    ]);
  });

  it('keeps personal term endpoints restricted to the authenticated student role', () => {
    expect(Reflect.getMetadata(ROLES_KEY, StudentSemesterController.prototype.findMySemesters)).toEqual([
      'student',
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, StudentTermController.prototype.findMyTerms)).toEqual([
      'student',
    ]);
  });
});
