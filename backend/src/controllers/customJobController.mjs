import { validateCustomJobRequest } from '../models/customJobRequestModel.mjs';
import { transformAndSaveCustomJobs } from '../services/customJobService.mjs';

export function createCustomJobController(service = transformAndSaveCustomJobs) {
  return async function customJobController(req, res) {
    const validation = validateCustomJobRequest(req.body);

    if (!validation.isValid) {
      return res.status(validation.status).json({ error: validation.message });
    }

    try {
      const { jobs, savedPath } = await service(validation.data.content);

      return res.json({
        success: true,
        count: jobs.length,
        portal: 'custom',
        outputFile: savedPath,
        jobs
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  };
}
