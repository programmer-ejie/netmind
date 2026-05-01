const express = require("express");
const createCrudController = require("../utils/crudFactory");
const tables = require("../utils/tableConfig");
const asyncHandler = require("../utils/asyncHandler");

const router = express.Router();

for (const [resource, config] of Object.entries(tables)) {
  const controller = createCrudController(config);

  router
    .route(`/${resource}`)
    .get(asyncHandler(controller.list))
    .post(asyncHandler(controller.create));

  router
    .route(`/${resource}/:id`)
    .get(asyncHandler(controller.getById))
    .patch(asyncHandler(controller.update))
    .delete(asyncHandler(controller.remove));
}

module.exports = router;
