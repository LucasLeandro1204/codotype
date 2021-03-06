import * as React from "react";
import classnames from "classnames";
import { Draggable } from "react-beautiful-dnd";
import { Dropdown } from "react-bootstrap";
import { AttributeListItemLabel } from "./AttributeListItemLabel";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { DATATYPE_META, Attribute, SchemaSource } from "@codotype/core";
import {
    faTrashAlt,
    faPencilAlt,
    faEllipsisH,
    faLock,
} from "@fortawesome/free-solid-svg-icons";
import styled from "styled-components";

// // // //

// interface AttributeListItemProps {
//     attribute: Attribute;
//     onEditButtonClick: (attributeToBeEdited: Attribute) => void;
//     onRemoveButtonClick: (attributeToBeRemoved: Attribute) => void;
// }

// padding: 0.25rem 0.5rem
const StyledListItem = styled.li`
    cursor: grab;
    border-left: 3px solid #adb5bd !important;

    &.autoGenerated {
        border-left: 3px solid #02b875 !important;
    }

    &:hover {
        .controls {
            opacity: 1;
        }
    }

    &:last-child {
        border-bottom-left-radius: 0px;
        border-bottom-right-radius: 0px;
    }

    .controls {
        transition: opacity 0.25s ease-in;
        opacity: 0;
        .dropdown-toggle.btn.btn-sm {
            &:after {
                display: none;
            }
        }
    }
`;

/**
 * AttributeListItem
 * @param attribute
 * @param props.index
 * @param onClickEdit
 * @param onClickDelete
 */
export function AttributeListItem(props: {
    attribute: Attribute;
    index: number;
    onClickEdit: (attributeToBeEdited: Attribute) => void;
    onClickDelete: (attributeToDelete: Attribute) => void;
}) {
    const { attribute } = props;
    return (
        <Draggable draggableId={String(attribute.id)} index={props.index}>
            {provided => (
                <StyledListItem
                    className={classnames(
                        "list-group-item list-group-item-action py-0 px-2",
                        {
                            autoGenerated:
                                attribute.source === SchemaSource.GENERATOR,
                        },
                    )}
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                >
                    <div className="row d-flex align-items-center">
                        <div className="col-sm-10">
                            <AttributeListItemLabel
                                attribute={attribute}
                                datatype={
                                    // @ts-ignore
                                    DATATYPE_META[attribute.datatype]
                                }
                            />
                        </div>

                        {attribute.locked && (
                            <div
                                className="col-sm-2 text-right controls justify-content-end"
                                v-if="item.locked"
                            >
                                <span
                                    className=" badge badge-secondary"
                                    title="This Attribute is auto-generated - it may not be edited or removed."
                                >
                                    {/* <i className="fa fa-fw fa-lock" /> */}
                                    <FontAwesomeIcon icon={faLock} />
                                </span>
                            </div>
                        )}

                        {!attribute.locked && (
                            <div className="col-sm-2 text-right controls">
                                <Dropdown alignRight>
                                    <Dropdown.Toggle
                                        variant="light"
                                        size="sm"
                                        className="rounded px-0 py-0 d-flex"
                                        id={`attribute-${attribute.id}-list-item`}
                                    >
                                        <FontAwesomeIcon icon={faEllipsisH} />
                                    </Dropdown.Toggle>

                                    <Dropdown.Menu>
                                        <Dropdown.Item
                                            onClick={() => {
                                                props.onClickEdit(attribute);
                                            }}
                                        >
                                            <FontAwesomeIcon
                                                className="mr-2"
                                                icon={faPencilAlt}
                                            />
                                            Edit
                                        </Dropdown.Item>
                                        <Dropdown.Item
                                            onClick={() => {
                                                props.onClickDelete(attribute);
                                            }}
                                        >
                                            <FontAwesomeIcon
                                                className="mr-2"
                                                icon={faTrashAlt}
                                            />
                                            Delete
                                        </Dropdown.Item>
                                    </Dropdown.Menu>
                                </Dropdown>
                            </div>
                        )}
                    </div>
                </StyledListItem>
            )}
        </Draggable>
    );
}
