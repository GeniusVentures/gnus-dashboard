import { NextApiRequest, NextApiResponse } from "next";
import Joi from "joi";

export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    
    next();
  };
};

export const schemas = {
  jobSubmission: Joi.object({
    jsonRequest: Joi.string().required().max(10000),
    type: Joi.string().valid('processing', 'estimation').required(),
    priority: Joi.number().integer().min(1).max(5).default(3)
  }),

  gasPrice: Joi.object({
    network: Joi.string().valid('mainnet', 'sepolia', 'amoy').default('mainnet')
  }),

  walletAddress: Joi.object({
    address: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required()
  })
};

export const sanitizeInput = (input: any): any => {
  if (typeof input === 'string') {
    // Remove potentially dangerous characters
    return input.replace(/[<>\"'&]/g, '');
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return input;
};