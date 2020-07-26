
const {hash_data} = require('../services/encryption.service');



/**
 * Return the user model
 * @param {sequelize.Sequelize} sequelize
 * @param {sequelize.DataTypes} DataTypes
 * @returns {sequelize.Model} user_model
 */
module.exports = (sequelize, DataTypes) => {

    /**
     * The attributes of an user are:
     * - firstName {String} The user's first name
     * - lastName {String} The user's last name
     * - email {String} The user's email address
     * - password {String} The user's hashed password
     * - teamId {?Integer} The id of the user's team
     * - voteId {?Integer} The id of the team that the user votes for
     *
     * The password is automatically encrypted.
     * Each bulk creation or update must force individual hooks.
     */
    let User = sequelize.define('user', {
        // Attributes definition

        firstName: {
            type: DataTypes.STRING(35),
            allowNull: false,
            validate: {
                notEmpty: true,
                len: [3, 35],
                is: {
                    args: /^([A-Za-z\u00C0-\u00D6\u00D8-\u00f6\u00f8-\u00ff\s]*)$/g,
                    msg: 'Must be only letters',
                }
            }
        },
        lastName: {
            type: DataTypes.STRING(35),
            allowNull: false,
            validate: {
                notEmpty: true,
                len: [3, 35],
                is: {
                    args: /^([A-Za-z\u00C0-\u00D6\u00D8-\u00f6\u00f8-\u00ff\s]*)$/g,
                    msg: 'Must be only letters',
                }
            }
        },
        github: {
            type: DataTypes.STRING(256),
            allowNull: true,
            validate: {
                notEmpty: true,
                len: [3, 35]
            }
        },
        linkedin: {
            type: DataTypes.STRING(256),
            allowNull: true,
            validate: {
                notEmpty: true,
                len: [3, 35]
            }
        },
        email: {
            type: DataTypes.STRING(256),
            unique: true,
            allowNull: false,
            validate: {
                notEmpty: true,
                isEmail: true
            }
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        },
        teamId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'teams',
                key: 'id'
            }
        },
        teamOwner: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        voteId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'teams',
                key: 'id'
            }
        }
    }, {
        // Options about the model

        indexes: [
            {
                unique: true,
                fields: ['email']
            }
        ],
        validate: {
            differentThanTeam() {
                if (this.voteId && this.voteId === this.teamId) {
                    throw new Error('Voting for its own team is forbidden.');
                }
            }
        }
    });

    // Individual before creation hook
    User.beforeCreate(async user => {

        if (!user.password.length || user.password.length > 200) {
            return Promise.reject('Invalid password.');
        }

        user.password = await hash_data(user.password);
    });

    // Individual before update hook
    User.beforeUpdate(async user => {

        if (user.changed('password')) {

            if (!user.password.length || user.password.length > 200) {
                return Promise.reject('Invalid password.');
            }

            user.password = await hash_data(user.password);
        }
    });

    return User;
};
