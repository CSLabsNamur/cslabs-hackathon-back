
/**
 * Return the team model
 * @param {sequelize.Sequelize} sequelize
 * @param {sequelize.DataTypes} DataTypes
 * @returns {sequelize.Model} team_model
 */
module.exports = (sequelize, DataTypes) => {

    return sequelize.define('team', {
        // Attributes definition

        name: {
            type: DataTypes.STRING(35),
            allowNull: false,
            unique: true,
            validate: {
                notEmpty: true,
                len: [3, 35]
            }
        },
        description: {
            type: DataTypes.STRING(256),
            allowNull: false,
            unique: false,
            validate: {
                len: [0, 256]
            }
        },
        idea: {
            type: DataTypes.STRING(256),
            allowNull: false,
            unique: false,
            validate: {
                len: [0, 256]
            }
        },
        token: {
            type: DataTypes.STRING(20),
            allowNull: false,
            validate: {
                notEmpty: true,
                len: [20, 20]
            }
        },
        valid: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        }
    });
};
