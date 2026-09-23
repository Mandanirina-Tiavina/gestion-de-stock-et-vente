import express from 'express';
import { authenticateToken, authorizeRoles } from '../middleware/auth.js';
import {
  getMembers,
  createMember,
  resetMemberPassword,
  updateMemberRole,
  deleteMember
} from '../controllers/userController.js';

const router = express.Router();

router.use(authenticateToken, authorizeRoles('admin'));

router.get('/', getMembers);
router.post('/', createMember);
router.put('/:id/password', resetMemberPassword);
router.put('/:id/role', updateMemberRole);
router.delete('/:id', deleteMember);

export default router;
