class ApiResponse {
  static success(res, message = 'Success', data = null, statusCode = 200, meta = null) {
    const response = {
      success: true,
      message,
      data
    };
    if (meta) {
      response.meta = meta;
    }
    return res.status(statusCode).json(response);
  }

  static created(res, message = 'Resource created successfully', data = null, meta = null) {
    return this.success(res, message, data, 201, meta);
  }

  static error(res, message = 'An error occurred', statusCode = 500, errors = null) {
    const response = {
      success: false,
      message
    };
    if (errors) {
      response.errors = errors;
    }
    return res.status(statusCode).json(response);
  }
}

module.exports = ApiResponse;
