const express = require('express');
const router = express.Router();


router.post('/', (req, res) => {
    // console.log("xsxsxsxs",req.body)
    res.status(200).json({ message: 'Command executed successfully' });
});

module.exports = router;