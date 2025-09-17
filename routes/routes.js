// const express = require('express');
// const router = express.Router();
// const authController = require('../controller/loginController')

// router.get('/',authController.betfairLogin)

// module.exports = router

import express from 'express';
import {delayedApiTest,listAllEvents,fullFlowMockOrder,getSessionToken,fullFlowOrder} from '../controller/loginController.js'; // note the .js extension

const router = express.Router();

router.get('/getSessionToken',getSessionToken)
router.get('/', delayedApiTest);
router.get('/listEvents',listAllEvents)
router.get('/mockOrder',fullFlowMockOrder)
router.get('/order',fullFlowOrder)
export default router;