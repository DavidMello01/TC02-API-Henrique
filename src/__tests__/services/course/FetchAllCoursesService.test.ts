import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ICourseRepository } from '../../../repository/interfaces/ICourseRepository';
import { FetchAllCoursesService } from '../../../services/course/FetchAllCoursesService';
import { Course } from '@prisma/client';

describe('FetchAllCoursesService', () => {
	let fetchAllCoursesService: FetchAllCoursesService;
	let courseRepository: ICourseRepository;

	beforeEach(() => {
		courseRepository = {
			fetchAllCourses: vi.fn(),
		} as unknown as ICourseRepository;

		fetchAllCoursesService = new FetchAllCoursesService(courseRepository);
	});

	it('should fetch all courses successfully', async () => {
		const courses = [
			{
				courseId: 1,
				courseName: 'Course 1',
				courseCoordinatorEmail: 'coordinator1@example.com',
			},
			{
				courseId: 2,
				courseName: 'Course 2',
				courseCoordinatorEmail: 'coordinator2@example.com',
			},
		] as Course[];

		(courseRepository.fetchAllCourses as any).mockResolvedValue(courses);

		const result = await fetchAllCoursesService.execute();

		expect(courseRepository.fetchAllCourses).toHaveBeenCalled();
		expect(result).toEqual(courses);
	});

	it('should return undefined if no courses are found', async () => {
		(courseRepository.fetchAllCourses as any).mockResolvedValue(undefined);

		const result = await fetchAllCoursesService.execute();

		expect(courseRepository.fetchAllCourses).toHaveBeenCalled();
		expect(result).toBeUndefined();
	});

	it('should throw an error if an exception is thrown', async () => {
		const error = new Error('Unexpected error');
		(courseRepository.fetchAllCourses as any).mockRejectedValue(error);

		await expect(fetchAllCoursesService.execute()).rejects.toThrow(error);
		expect(courseRepository.fetchAllCourses).toHaveBeenCalled();
	});
});
