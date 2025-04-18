const MeetingHistory = require('../../model/schema/meeting')
const mongoose = require('mongoose');

/*
    Add a meeting to the list
 */
const add = async (req, res) => {
    try {
        const { agenda, location, related, dateTime, notes, createBy, attendes, attendesLead } = req.body;
        // Check if each attende is a valid ObjectId (if provided)
        for (const id of attendes) {
            if (id && !mongoose.Types.ObjectId.isValid(id))
                res.status(440).json({ error: 'Invalid attendes value: ', attende });
        }
        // Check if each attendesLead is a valid ObjectId (if provided)
        for (const id of attendesLead) {
            if (id && !mongoose.Types.ObjectId.isValid(id))
                res.status(440).json({ error: 'Invalid attendesLead value: ', attende});
        }
        const meetingData = { 
            agenda, 
            location, 
            related, 
            dateTime, 
            notes, 
            createBy,
            timestamp: new Date(),
        };

        if (attendes) {
            meetingData.attendes = attendes;
        }
        if (attendesLead) {
            meetingData.attendesLead = attendesLead;
        }
        const result = new MeetingHistory(meetingData);
        await result.save();
        res.status(201).json(result);
    } catch (err) {
        console.error('Failed to create task:', err);
        res.status(404).json({ error: 'Failed to create meeting: ', err });
    }
}

/*
    View the meeting page overview
 */
const index = async (req, res) => {
    query = req.query;
    query.deleted = false;
    if (query.createBy) {
        query.createBy = new mongoose.Types.ObjectId(query.createBy);
    }
    try {
        let result = await MeetingHistory.aggregate([
            { $match: query },
            {
                $lookup: {
                    from: 'Contacts',
                    localField: 'attendes',
                    foreignField: '_id',
                    as: 'contact'
                }
            },
            {
                $lookup: {
                    from: 'Leads',
                    localField: 'attendesLead',
                    foreignField: '_id',
                    as: 'Lead'
                }
            },
            {
                $lookup: {
                    from: 'User',
                    localField: 'createBy',
                    foreignField: '_id',
                    as: 'users'
                }
            },
            { $unwind: { path: '$users', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$contact', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$Lead', preserveNullAndEmptyArrays: true } },
            { $match: { 'users.deleted': false } },
            {
                $addFields: {
                    createByName: '$user.username',
                    attendesName: {
                        $cond: {
                            if: '$contact',
                            then: { $concat: ['$contact.title', ' ', '$contact.firstName', ' ', '$contact.lastName'] },
                            else: '$lead.leadName'
                        }
                    }
                }
            },
            { $project: { users: 0, contact: 0, Lead: 0 } },
        ]);
        res.send(result);
    } catch (err) {
        console.error('Error: ', err);
        res.status(500).send('Internal Server Error');
    }
}

/*
    View a single meeting
 */
const view = async (req, res) => {
    try {
        let response = await MeetingHistory.findOne({ _id: req.params.id });
        if (!response) return res.status(404).json({ message: 'no meeting Data Found.'});
        let result = await MeetingHistory.aggregate([
            { $match: { _id: response._id } },
            {
                $lookup: {
                    from: 'Contacts',
                    localField: 'attendes',
                    foreignField: '_id',
                    as: 'contact'
                }
            },
            {
                $lookup: {
                    from: 'Leads',
                    localField: 'attendesLead',
                    foreignField: '_id',
                    as: 'Lead'
                }
            },
            {
                $lookup: {
                    from: 'User',
                    localField: 'createBy',
                    foreignField: '_id',
                    as: 'users'
                }
            },
            { $unwind: { path: '$users', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$contact', preserveNullAndEmptyArrays: true } },
            { $unwind: { path: '$Lead', preserveNullAndEmptyArrays: true } },
            { $match: { 'users.deleted': false } },
            {
                $addFields: {
                    createByName: '$user.username',
                    attendesName: {
                        $cond: {
                            if: '$contact',
                            then: { $concat: ['$contact.title', ' ', '$contact.firstName', ' ', '$contact.lastName'] },
                            else: '$lead.leadName'
                        }
                    }
                }
            },
            { $project: { contact: 0, users: 0, Lead: 0 } },
        ]);
        res.status(200).json(result[0]);
    } catch (err) {
        console.error('Error:', err);
        res.status(400).json({ Error: err });
    }
}

/*
    Delete a particular meeting
 */
const deleteData = async (req, res) => {
    try {
        const result = await MeetingHistory.findByIdAndUpdate(req.params.id, { deleted: true });
        res.status(200).json({ 
            message: 'done: meeting soft deleted', 
            result 
        });
    } catch (err) {
        res.status(404).json({ 
            message: 'meeting delete error', 
            err 
        });
    }
}

/*
    Delete multiple meetings
 */
const deleteMany = async (req, res) => {
    try {
        const result = await MeetingHistory.updateMany(
            { _id: { $in: req.body } }, 
            { $set: { deleted: true } }
        );

        if (result?.matchedCount > 0 && result?.modifiedCount > 0) {
            return res.status(200).json({ 
                message: "Meetings Removed successfully", 
                result 
            });
        } 
        else {
            return res.status(404).json({ 
                success: false, 
                message: "Failed to remove Meetings"
            });
        }
    } catch (err) {
        return res.status(404).json({ 
            success: false, 
            message: 'error deleting Meetings', 
            error: err, 
        });
    }
}

module.exports = { add, index, view, deleteData, deleteMany }
