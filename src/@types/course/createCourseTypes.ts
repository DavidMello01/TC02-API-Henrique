import Joi from 'joi';

export const createCourseTypes = Joi.object({
	courseName: Joi.string().required().min(2),
	courseCoordinatorEmail: Joi.string().email().required(),
});
