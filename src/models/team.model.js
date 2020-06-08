
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
        description_team: {
            type: DataTypes.STRING(128),
            allowNull: true,
            unique: true,
            validate: {
                notEmpty: true,
                len: [3, 128]
            }
        },
        idea: {
            type: DataTypes.STRING(35),
            allowNull: true,
            unique: false,
            validate: {
                notEmpty: true,
                len: [3, 35]
            }
        },
        description_idea: {
            type: DataTypes.STRING(256),
            allowNull: true,
            unique: false,
            validate: {
                notEmpty: true,
                len: [3, 256]
            }
        }
    });
};
