import {
  BeforeInsert,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Team } from '../../teams/entities/team.entity';

/**
 * TypeORM entity about an user
 */
@Entity()
export class User {
  /** The ID (uuid) of the user
   * @type {string}
   */
  @PrimaryGeneratedColumn('uuid')
  public id?: string;

  /** The email address of the user
   * @type {string}
   */
  @Column({ unique: true, nullable: false })
  public email: string;

  @Column({ nullable: false })
  public firstName: string;

  @Column({ nullable: false })
  public lastName: string;

  @Column({ nullable: true })
  public github: string;

  @Column({ nullable: true })
  public linkedIn: string;

  @Column({ nullable: true })
  public comment: string;

  @Column({ type: 'boolean', default: false })
  public paidCaution: boolean;

  /** The email address of the user
   * @type {boolean}
   * @default false
   */
  @Column({ type: 'boolean', default: false })
  public isAdmin: boolean;

  /**
   * Path of the user CV
   * @type {[string]}
   * @default null
   */
  @Column({ nullable: true })
  public cv?: string;

  /** The hashed refresh token of the user
   * It is excluded from the Http responses
   * @type {string | null}
   */
  @Column({ nullable: true })
  @Exclude()
  public currentHashedRefreshToken?: string;

  /** The hashed password of the user
   * It is excluded from the Http responses
   * @type {string | null}
   */
  @Column()
  @Exclude()
  public password: string;

  @Column({ type: 'boolean', default: false })
  public isTeamOwner: boolean;

  @ManyToOne(() => Team, (team: Team) => team.members, { onDelete: 'SET NULL' })
  public team: Team;

  @ManyToOne(() => Team, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'voteId' })
  public vote: Team;

  @Column({ type: 'uuid', nullable: true })
  public voteId: string;

  @Column({ type: 'boolean' })
  public imageAgreement: boolean;

  @Column({ type: 'boolean' })
  public subscribeFormation: boolean;

  @Column({ type: 'bigint'})
  public createdAt: number;

  @BeforeInsert()
  public setCreatedAt() {
    this.createdAt = Date.now();
  }

}
