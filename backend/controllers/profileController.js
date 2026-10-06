import * as userService from '../services/userService.js';
import { ok } from '../utils/response.js';

export async function getProfile(req, res, next) {
  try {
    const data = await userService.getUserProfile();
    return ok(res, { data, message: 'Lay thong tin profile thanh cong' });
  } catch (error) {
    next(error);
  }
}